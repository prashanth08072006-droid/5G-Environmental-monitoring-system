from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class LocationBase(BaseModel):
    city_name: str
    latitude: float
    longitude: float

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    location_id: int
    latest_reading: Optional["SensorReadingResponse"] = None
    pollution_risk: Optional[str] = "Moderate"
    latest_latency: Optional[float] = 12.4

    class Config:
        from_attributes = True

class SensorReadingBase(BaseModel):
    location_id: int
    temperature: float
    humidity: float
    aqi: int
    pm25: float
    pm10: float
    co2: float

class SensorReadingCreate(SensorReadingBase):
    latency: Optional[float] = 11.8
    delivery_rate: Optional[float] = 99.98
    edge_validated: Optional[bool] = True

class SensorReadingResponse(SensorReadingBase):
    reading_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    location_id: int
    alert_type: str
    severity: str
    message: str

class AlertResponse(AlertBase):
    alert_id: int
    timestamp: datetime
    city_name: Optional[str] = None

    class Config:
        from_attributes = True

class CommunicationMetricBase(BaseModel):
    location_id: int
    latency: float
    delivery_rate: float

class CommunicationMetricResponse(CommunicationMetricBase):
    metric_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class AnalyticsSummary(BaseModel):
    total_locations: int
    overall_avg_aqi: float
    dominant_pollutant: str
    high_risk_cities: List[str]
    average_5g_latency: float
    overall_delivery_rate: float
    active_alerts_count: int

class FiveGSimulationRequest(BaseModel):
    network_slice: str = Field(default="URLLC", description="URLLC, eMBB, or mMTC")
    induced_jitter_ms: float = Field(default=0.0, ge=0, le=100)
    simulated_packet_loss_pct: float = Field(default=0.0, ge=0, le=50)
    packet_burst_count: int = Field(default=10, ge=1, le=100)
