from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    name: str = Field(..., example="Rahul Sharma")
    phone: str = Field(..., example="9876543210")
    password: str = Field(..., min_length=6, example="password123")
    email: Optional[str] = Field(None, example="rahul@example.com")
    preferred_language: Optional[str] = Field("English", example="Hindi")


class UserLogin(BaseModel):
    phone: str = Field(..., example="9876543210")
    password: str = Field(..., example="password123")


class SendOtpRequest(BaseModel):
    mobile: str = Field(..., example="9876543210")
    service: Optional[str] = Field(None, example="account")


class VerifyOtpRequest(BaseModel):
    mobile: str = Field(..., example="9876543210")
    otp: str = Field(..., example="123456")


class OtpResponse(BaseModel):
    message: str
    mobile: str
    otp: Optional[str] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    preferred_language: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class FormCreate(BaseModel):
    form_type: str = Field(..., example="Account Opening")
    data: Dict[str, Any] = Field(default_factory=dict, example={"applicant_name": "Rahul Sharma", "account_type": "Savings"})


class FormTypeResponse(BaseModel):
    id: int
    form_name: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class FormResponse(BaseModel):
    id: int
    form_type_id: int
    form_type: str
    status: str
    data: Dict[str, Any]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ValidationRequest(BaseModel):
    name: str = Field(..., example="Rahul Sharma")
    mobile: str = Field(..., example="9876543210")
    dob: str = Field(..., example="15/08/1995")
    aadhaar: Optional[str] = Field(None, example="123456789012")


class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str]