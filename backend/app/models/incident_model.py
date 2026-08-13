from datetime import date

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Date, ForeignKey, Integer, Table, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# multi-qa-MiniLM-L6-cos-v1 output dimensionality (Phase 3 semantic search).
EMBEDDING_DIM = 384

# AIID links reports to incidents by their public numbers (incident_id /
# report_number), not by the surrogate primary keys — the join table follows.
incident_report_table = Table(
    "incident_report",
    Base.metadata,
    Column(
        "incident_id",
        Integer,
        ForeignKey("incident.incident_id"),
        primary_key=True,
    ),
    Column(
        "report_id",
        Integer,
        ForeignKey("report.report_number"),
        primary_key=True,
    ),
)


class Incident(Base):
    __tablename__ = "incident"

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(Integer, unique=True)
    title: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    incident_date: Mapped[date | None] = mapped_column(Date)
    alleged_deployer: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    alleged_developer: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    harmed_parties: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))

    reports = relationship(
        "Report",
        secondary=incident_report_table,
        back_populates="incidents",
        order_by="Report.report_number",
    )
    classifications = relationship(
        "MitClassification",
        back_populates="incident",
    )
