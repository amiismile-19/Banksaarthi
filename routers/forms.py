import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

try:
    from database import get_db
    from models import Form, FormType, User
    from schemas import FormCreate, FormResponse, FormTypeResponse
    from dependencies import get_current_user
    from services.pdf_service import generate_pdf
    from services.voice_service import convert_indic_numerals
except (ImportError, ValueError):
    from ..database import get_db
    from ..models import Form, FormType, User
    from ..schemas import FormCreate, FormResponse, FormTypeResponse
    from ..dependencies import get_current_user
    from ..services.pdf_service import generate_pdf
    from ..services.voice_service import convert_indic_numerals


router = APIRouter(
    prefix="/forms",
    tags=["Forms"]
)


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security_optional = HTTPBearer(auto_error=False)


def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not auth or not auth.credentials:
        return None
    try:
        from security import decode_token
        payload = decode_token(auth.credentials)
        user_id = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        pass
    return None


@router.get("/types", response_model=List[FormTypeResponse])
def get_form_types(db: Session = Depends(get_db)):
    """Retrieve all active form types (e.g. Account Opening, KYC, Loan, etc.)."""
    types = db.query(FormType).filter(FormType.is_active == True).order_by(FormType.id).all()
    return types


@router.get("/", response_model=List[FormResponse])
def list_user_forms(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """List all forms created by the user or recent forms in kiosk mode."""
    query = db.query(Form)
    if current_user:
        query = query.filter(Form.user_id == current_user.id)
    forms = query.order_by(Form.created_at.desc()).limit(20).all()

    results = []
    for f in forms:
        type_name = f.form_type.form_name if f.form_type else f"Form Type #{f.form_type_id}"
        data = f.form_data if isinstance(f.form_data, dict) else (json.loads(f.form_data) if f.form_data else {})
        results.append({
            "id": f.id,
            "form_type_id": f.form_type_id,
            "form_type": type_name,
            "status": f.status,
            "data": data,
            "created_at": f.created_at
        })
    return results


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_form(
    form_data: FormCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Create a new banking form draft (supports authenticated or kiosk/mobile mode)."""
    raw_type = form_data.form_type.strip()
    form_type_obj = None

    # Check if passed as numeric ID
    if raw_type.isdigit():
        form_type_obj = db.query(FormType).filter(FormType.id == int(raw_type)).first()
    else:
        form_type_obj = db.query(FormType).filter(FormType.form_name.ilike(raw_type)).first()

    # If form type not found, fallback to first available or create one
    if not form_type_obj:
        default_type = db.query(FormType).first()
        if not default_type:
            default_type = FormType(form_name=raw_type, description="Standard form")
            db.add(default_type)
            db.commit()
            db.refresh(default_type)
        form_type_obj = default_type

    # Normalize Indic digits in numeric/ID fields across the form data dictionary
    normalized_data = {}
    for k, v in form_data.data.items():
        if isinstance(v, str):
            if any(num_key in k.lower() for num_key in ["mobile", "phone", "aadhaar", "dob", "account", "amount", "pincode", "cash", "coins"]):
                normalized_data[k] = convert_indic_numerals(v).strip()
            else:
                normalized_data[k] = v
        else:
            normalized_data[k] = v

    pref_lang = (
        normalized_data.get("language")
        or normalized_data.get("preferred_language")
        or "English"
    )

    # Determine user ID: from JWT or from phone/mobile in form_data, or kiosk default
    user_id = None
    if current_user:
        user_id = current_user.id
    else:
        mobile = normalized_data.get("mobile") or normalized_data.get("phone")
        if mobile:
            clean_mobile = str(mobile).strip().replace(" ", "").replace("-", "")
            if clean_mobile.startswith("+91"):
                clean_mobile = clean_mobile[3:]
            user = db.query(User).filter(User.phone == clean_mobile).first()
            if not user:
                from security import hash_password
                user = User(
                    name=str(normalized_data.get("name") or f"User {clean_mobile[-4:]}"),
                    phone=clean_mobile,
                    hashed_password=hash_password("default123"),
                    preferred_language=str(pref_lang)
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            user_id = user.id
        else:
            first_user = db.query(User).first()
            user_id = first_user.id if first_user else 1

    form = Form(
        user_id=user_id,
        form_type_id=form_type_obj.id,
        status="draft",
        form_data=normalized_data
    )

    db.add(form)
    db.commit()
    db.refresh(form)

    return {
        "message": "Form created successfully",
        "form_id": form.id,
        "form_type_id": form.form_type_id,
        "form_type": form_type_obj.form_name,
        "status": form.status,
        "reference_id": f"BS{form.id:06d}"
    }



@router.get("/{form_id}", response_model=FormResponse)
def get_form(
    form_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Retrieve details and data of a specific form."""
    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )

    data = form.form_data
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    elif not isinstance(data, dict):
        data = {}

    type_name = form.form_type.form_name if form.form_type else f"Form Type #{form.form_type_id}"

    return {
        "id": form.id,
        "form_type_id": form.form_type_id,
        "form_type": type_name,
        "status": form.status,
        "data": data,
        "created_at": form.created_at
    }


@router.get("/{form_id}/pdf")
def create_pdf(
    form_id: int,
    db: Session = Depends(get_db)
):
    """Generate and return a filled PDF for the form."""
    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )

    data = form.form_data
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    elif not isinstance(data, dict):
        data = {}

    type_name = form.form_type.form_name if form.form_type else f"Form-{form.form_type_id}"

    path = generate_pdf(
        form.id,
        type_name,
        data
    )

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"banksaarthi_form_{form.id}.pdf"
    )

