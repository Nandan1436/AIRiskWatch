import logging
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import delete, func, insert, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.embedding_client import embed_text, incident_embedding_input
from app.models.incident_model import Incident, incident_report_table
from app.models.mit_classification_model import MitClassification
from app.models.report_model import Report
from app.models.user_model import ROLE_ADMIN, User
from app.services.incident_service import IncidentService
from app.services.ingestion_service import next_id, try_lock_id_allocation

logger = logging.getLogger(__name__)

_LIST_FIELDS = ("alleged_deployer", "alleged_developer", "harmed_parties")


class AdminError(RuntimeError):
    pass


class IdAllocationBusyError(RuntimeError):
    pass


def _clean_list(values: list[str] | None) -> list[str] | None:
    # Ingestion stores "nobody named" as NULL, not an empty array.
    cleaned = [v.strip() for v in values or [] if v and v.strip()]
    return cleaned or None


def _domain_from_url(url: str | None) -> str | None:
    if not url:
        return None
    host = urlparse(url).netloc.lower()
    return host.removeprefix("www.") or None


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    # --- users -----------------------------------------------------------

    def list_users(
        self, limit: int, offset: int, search: str | None = None
    ) -> tuple[list[User], int]:
        query = select(User)
        if search:
            pattern = f"%{search}%"
            query = query.where(or_(User.email.ilike(pattern), User.username.ilike(pattern)))
        total = self.db.scalar(select(func.count()).select_from(query.subquery()))
        users = self.db.scalars(
            query.order_by(User.created_at.desc(), User.id.desc()).limit(limit).offset(offset)
        ).all()
        return list(users), total or 0

    def update_user(
        self,
        actor: User,
        user_id: int,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> User | None:
        user = self.db.get(User, user_id)
        if user is None:
            return None
        # Guards against an admin locking everyone, including themselves, out.
        if user.id == actor.id and (
            (role is not None and role != ROLE_ADMIN) or is_active is False
        ):
            raise AdminError("You cannot demote or deactivate your own account")
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        self.db.commit()
        self.db.refresh(user)
        logger.info("admin: user id=%d updated by id=%d", user.id, actor.id)
        return user

    # --- incidents -------------------------------------------------------

    def create_incident(self, fields: dict[str, Any]) -> Incident:
        incident = Incident(
            title=fields["title"].strip(),
            description=fields.get("description"),
            incident_date=fields.get("incident_date"),
            **{name: _clean_list(fields.get(name)) for name in _LIST_FIELDS},
        )
        # Embed before taking the lock so it is held only for the insert.
        incident.embedding = self._incident_embedding(incident)
        self._lock_id_allocation()
        incident.incident_id = next_id(self.db, Incident.incident_id)
        self.db.add(incident)
        self.db.commit()
        logger.info("admin: created incident_id=%d", incident.incident_id)
        return self._get_incident(incident.incident_id)

    def update_incident(self, incident_id: int, fields: dict[str, Any]) -> Incident | None:
        incident = self.db.scalar(select(Incident).where(Incident.incident_id == incident_id))
        if incident is None:
            return None
        fields = {k: v for k, v in fields.items() if not (k == "title" and v is None)}
        for name, value in fields.items():
            if name in _LIST_FIELDS:
                value = _clean_list(value)
            elif name == "title":
                value = value.strip()
            setattr(incident, name, value)
        if "title" in fields or "description" in fields:
            # Same input as backfill and ingestion, so search and dedup stay consistent.
            incident.embedding = self._incident_embedding(incident)
        self.db.commit()
        return self._get_incident(incident_id)

    def delete_incident(self, incident_id: int) -> bool:
        incident = self.db.scalar(select(Incident).where(Incident.incident_id == incident_id))
        if incident is None:
            return False
        # Linked reports are kept; they can be re-linked or deleted separately.
        self.db.execute(delete(MitClassification).where(MitClassification.incident_id == incident_id))
        self.db.execute(
            delete(incident_report_table).where(incident_report_table.c.incident_id == incident_id)
        )
        self.db.delete(incident)
        self.db.commit()
        logger.info("admin: deleted incident_id=%d", incident_id)
        return True

    # --- reports ---------------------------------------------------------

    def list_reports(
        self, limit: int, offset: int, search: str | None = None
    ) -> tuple[list[Report], int]:
        query = select(Report)
        if search:
            pattern = f"%{search}%"
            query = query.where(or_(Report.title.ilike(pattern), Report.url.ilike(pattern)))
        total = self.db.scalar(select(func.count()).select_from(query.subquery()))
        reports = self.db.scalars(
            query.options(selectinload(Report.incidents))
            .order_by(Report.report_number.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        return list(reports), total or 0

    def get_report(self, report_number: int) -> Report | None:
        return self.db.scalar(
            select(Report)
            .where(Report.report_number == report_number)
            .options(selectinload(Report.incidents))
        )

    def create_report(self, fields: dict[str, Any]) -> Report:
        incident_ids = fields.pop("incident_ids", None) or []
        self._ensure_incidents_exist(incident_ids)
        self._lock_id_allocation()
        report_number = next_id(self.db, Report.report_number)
        self.db.add(
            Report(
                report_number=report_number,
                title=fields["title"].strip(),
                text=fields.get("text"),
                url=fields.get("url"),
                source_domain=fields.get("source_domain") or _domain_from_url(fields.get("url")),
                authors=fields.get("authors"),
                published_date=fields.get("published_date"),
                language=fields.get("language") or "en",
            )
        )
        self.db.flush()
        self._replace_links(report_number, incident_ids)
        self.db.commit()
        logger.info("admin: created report_number=%d", report_number)
        return self.get_report(report_number)

    def update_report(self, report_number: int, fields: dict[str, Any]) -> Report | None:
        report = self.db.scalar(select(Report).where(Report.report_number == report_number))
        if report is None:
            return None
        fields = {k: v for k, v in fields.items() if not (k == "title" and v is None)}
        incident_ids = fields.pop("incident_ids", None)
        if incident_ids is not None:
            self._ensure_incidents_exist(incident_ids)
            self._replace_links(report_number, incident_ids)
        for name, value in fields.items():
            setattr(report, name, value.strip() if name == "title" else value)
        if "url" in fields and not report.source_domain:
            report.source_domain = _domain_from_url(report.url)
        self.db.commit()
        self.db.expire_all()
        return self.get_report(report_number)

    def delete_report(self, report_number: int) -> bool:
        report = self.db.scalar(select(Report).where(Report.report_number == report_number))
        if report is None:
            return False
        self.db.execute(
            delete(incident_report_table).where(incident_report_table.c.report_id == report_number)
        )
        self.db.delete(report)
        self.db.commit()
        logger.info("admin: deleted report_number=%d", report_number)
        return True

    # --- helpers ---------------------------------------------------------

    def _lock_id_allocation(self) -> None:
        if not try_lock_id_allocation(self.db):
            self.db.rollback()
            raise IdAllocationBusyError("Ingestion is running, try again shortly")

    def _get_incident(self, incident_id: int) -> Incident:
        self.db.expire_all()
        return IncidentService(self.db).get_incident(incident_id)

    def _ensure_incidents_exist(self, incident_ids: list[int]) -> None:
        if not incident_ids:
            return
        found = set(
            self.db.scalars(select(Incident.incident_id).where(Incident.incident_id.in_(incident_ids)))
        )
        missing = sorted(set(incident_ids) - found)
        if missing:
            raise AdminError(f"Unknown incident id(s): {', '.join(map(str, missing))}")

    def _replace_links(self, report_number: int, incident_ids: list[int]) -> None:
        self.db.execute(
            delete(incident_report_table).where(incident_report_table.c.report_id == report_number)
        )
        for incident_id in sorted(set(incident_ids)):
            self.db.execute(
                insert(incident_report_table).values(incident_id=incident_id, report_id=report_number)
            )

    @staticmethod
    def _incident_embedding(incident: Incident) -> list[float] | None:
        text = incident_embedding_input(incident.title, incident.description)
        return embed_text(text) if text else None
