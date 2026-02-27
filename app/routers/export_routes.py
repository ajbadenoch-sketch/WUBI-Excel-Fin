from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import get_current_user
from app.services.excel_export import export_full_report

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/excel")
async def download_excel(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    output = export_full_report(user, db)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=VidaControl_{user.name}.xlsx"
        }
    )
