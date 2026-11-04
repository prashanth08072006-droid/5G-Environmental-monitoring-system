from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database import Base

class Location(Base):
    __tablename__ = "locations"

    location_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    city_name = Column(String(100), unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    readings = relationship("SensorReading", back_populates="location", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="location", cascade="all, delete-orphan")
    communication_metrics = relationship("CommunicationMetric", back_populates="location", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    reading_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.location_id"), nullable=False, index=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    aqi = Column(Integer, nullable=False)
    pm25 = Column(Float, nullable=False)
    pm10 = Column(Float, nullable=False)
    co2 = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    location = relationship("Location", back_populates="readings")

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.location_id"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MODERATE, HIGH, CRITICAL
    message = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    location = relationship("Location", back_populates="alerts")

class CommunicationMetric(Base):
    __tablename__ = "communication_metrics"

    metric_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.location_id"), nullable=False, index=True)
    latency = Column(Float, nullable=False)  # ms
    delivery_rate = Column(Float, nullable=False)  # %
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    location = relationship("Location", back_populates="communication_metrics")
