from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    Float
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, index=True, nullable=False)
    email = Column(String(150), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    preferred_language = Column(String(50), default="English")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    forms = relationship("Form", back_populates="user")
    sessions = relationship("UserSession", back_populates="user")
    ocr_documents = relationship("OCRDocument", back_populates="user")
    voice_inputs = relationship("VoiceInput", back_populates="user")


class FormType(Base):
    __tablename__ = "form_types"

    id = Column(Integer, primary_key=True, index=True)
    form_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    forms = relationship("Form", back_populates="form_type")


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_type_id = Column(Integer, ForeignKey("form_types.id"), nullable=False)
    status = Column(String(30), default="draft")
    form_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    user = relationship("User", back_populates="forms")
    form_type = relationship("FormType", back_populates="forms")
    fields = relationship("FormField", back_populates="form")
    generated_documents = relationship("GeneratedDocument", back_populates="form")
    validation_logs = relationship("ValidationLog", back_populates="form")


class FormField(Base):
    __tablename__ = "form_fields"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    field_type = Column(String(50), nullable=True)
    is_valid = Column(Boolean, default=True)
    validation_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("Form", back_populates="fields")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    language = Column(String(50), default="English")
    current_form_id = Column(Integer, ForeignKey("forms.id"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sessions")


class OCRDocument(Base):
    __tablename__ = "ocr_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=True)
    document_type = Column(String(100), nullable=True)
    file_path = Column(String(500), nullable=False)
    extracted_text = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    processing_status = Column(String(50), default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ocr_documents")


class VoiceInput(Base):
    __tablename__ = "voice_inputs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=True)
    audio_file_path = Column(String(500), nullable=False)
    transcribed_text = Column(Text, nullable=True)
    detected_language = Column(String(50), nullable=True)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="voice_inputs")


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    document_type = Column(String(100), nullable=False)
    file_path = Column(String(500), nullable=False)
    qr_code = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("Form", back_populates="generated_documents")


class ValidationLog(Base):
    __tablename__ = "validation_logs"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    validation_status = Column(String(50), nullable=False)
    error_message = Column(Text, nullable=True)
    validated_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("Form", back_populates="validation_logs")