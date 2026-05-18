from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.user import User

router = APIRouter()


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    applications = (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.applied_on.desc())
        .all()
    )
    counts = Counter(application.status.value for application in applications)
    total = len(applications)
    responses = counts[ApplicationStatus.OA.value] + counts[ApplicationStatus.INTERVIEW.value] + counts[ApplicationStatus.OFFER.value]

    return {
        "total_applications": total,
        "response_rate": round((responses / total) * 100, 1) if total else 0,
        "status_counts": {
            status.value: counts[status.value]
            for status in ApplicationStatus
        },
        "recent_applications": [
            {
                "id": application.id,
                "company_name": application.company_name,
                "role_title": application.role_title,
                "status": application.status.value,
                "applied_on": application.applied_on.isoformat(),
                "location": application.location,
            }
            for application in applications[:5]
        ],
    }
