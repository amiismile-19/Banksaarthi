from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from database import get_db
    from models import User
    from schemas import (
        UserCreate,
        UserLogin,
        UserResponse,
        Token,
        SendOtpRequest,
        VerifyOtpRequest,
        OtpResponse
    )
    from security import (
        hash_password,
        verify_password,
        create_access_token
    )
    from dependencies import get_current_user
    from services.voice_service import convert_indic_numerals
except (ImportError, ValueError):
    from ..database import get_db
    from ..models import User
    from ..schemas import (
        UserCreate,
        UserLogin,
        UserResponse,
        Token,
        SendOtpRequest,
        VerifyOtpRequest,
        OtpResponse
    )
    from ..security import (
        hash_password,
        verify_password,
        create_access_token
    )
    from ..dependencies import get_current_user
    from ..services.voice_service import convert_indic_numerals


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.phone == user_data.phone.strip()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    user = User(
        name=user_data.name.strip(),
        phone=user_data.phone.strip(),
        email=user_data.email.strip() if user_data.email else None,
        preferred_language=user_data.preferred_language or "English",
        hashed_password=hash_password(user_data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful",
        "user_id": user.id,
        "name": user.name,
        "phone": user.phone
    }


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.phone == login_data.phone.strip()
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password"
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


# In-memory OTP storage for demonstration / verification
OTP_STORE = {}


@router.post("/send-otp", response_model=OtpResponse)
def send_otp(
    data: SendOtpRequest,
    db: Session = Depends(get_db)
):
    """Generate and return a 6-digit OTP for mobile verification."""
    raw_mobile = convert_indic_numerals(data.mobile or "").strip()
    clean_mobile = raw_mobile.replace(" ", "").replace("-", "")
    if clean_mobile.startswith("+91"):
        clean_mobile = clean_mobile[3:]
    elif clean_mobile.startswith("0"):
        clean_mobile = clean_mobile[1:]

    if len(clean_mobile) != 10 or not clean_mobile.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid 10-digit mobile number"
        )

    # In hackathon demo mode, standard OTP or random
    import random
    otp_code = str(random.randint(100000, 999999))
    OTP_STORE[clean_mobile] = otp_code

    # If user doesn't exist yet, auto-provision user
    user = db.query(User).filter(User.phone == clean_mobile).first()
    if not user:
        user = User(
            name=f"User {clean_mobile[-4:]}",
            phone=clean_mobile,
            hashed_password=hash_password(otp_code),
            preferred_language="English"
        )
        db.add(user)
        db.commit()

    return {
        "message": f"OTP sent to {clean_mobile}",
        "mobile": clean_mobile,
        "otp": otp_code
    }


@router.post("/verify-otp", response_model=OtpResponse)
def verify_otp(
    data: VerifyOtpRequest,
    db: Session = Depends(get_db)
):
    """Verify the 6-digit OTP and return a JWT access token."""
    raw_mobile = convert_indic_numerals(data.mobile or "").strip()
    clean_mobile = raw_mobile.replace(" ", "").replace("-", "")
    if clean_mobile.startswith("+91"):
        clean_mobile = clean_mobile[3:]
    elif clean_mobile.startswith("0"):
        clean_mobile = clean_mobile[1:]

    clean_otp = convert_indic_numerals(data.otp or "").strip()
    stored_otp = OTP_STORE.get(clean_mobile)
    # Accept stored OTP or demo bypass 123456
    if not stored_otp or (clean_otp != stored_otp and clean_otp != "123456"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )


    user = db.query(User).filter(User.phone == clean_mobile).first()
    if not user:
        user = User(
            name=f"User {clean_mobile[-4:]}",
            phone=clean_mobile,
            hashed_password=hash_password("default123"),
            preferred_language="English"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)

    return {
        "message": "Mobile number verified successfully",
        "mobile": clean_mobile,
        "access_token": token,
        "token_type": "bearer"
    }

