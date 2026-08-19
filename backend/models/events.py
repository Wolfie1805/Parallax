from datetime import datetime

from sqlalchemy import String, Float, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Satellite(Base):
    __tablename__ = "satellites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    norad_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tle_line1: Mapped[str] = mapped_column(Text, nullable=False)
    tle_line2: Mapped[str] = mapped_column(Text, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Aircraft(Base):
    __tablename__ = "aircraft"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    icao24: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    callsign: Mapped[str] = mapped_column(String(20), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=True)
    lng: Mapped[float] = mapped_column(Float, nullable=True)
    altitude: Mapped[float] = mapped_column(Float, nullable=True)
    velocity: Mapped[float] = mapped_column(Float, nullable=True)
    heading: Mapped[float] = mapped_column(Float, nullable=True)
    origin_country: Mapped[str] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
