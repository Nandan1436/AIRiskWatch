from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MitClassification(Base):
    __tablename__ = "mit_classification"

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("incident.incident_id")
    )
    risk_domain: Mapped[str | None] = mapped_column(Text)
    risk_subdomain: Mapped[str | None] = mapped_column(Text)
    causal_entity: Mapped[str | None] = mapped_column(Text)
    timing: Mapped[str | None] = mapped_column(Text)
    intent: Mapped[str | None] = mapped_column(Text)
    published: Mapped[bool | None] = mapped_column(Boolean)
    confidence: Mapped[float | None] = mapped_column(Float)
    classified_by: Mapped[str | None] = mapped_column(Text)
    classified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    incident = relationship("Incident", back_populates="classifications")
