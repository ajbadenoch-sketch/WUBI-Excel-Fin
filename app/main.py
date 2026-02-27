from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import (
    auth_routes, dashboard_routes, plos_routes,
    financial_routes, health_routes, export_routes
)

app = FastAPI(title="VidaControl", description="Sistema Integral de Control de Vida")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Routers
app.include_router(auth_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(plos_routes.router)
app.include_router(financial_routes.router)
app.include_router(health_routes.router)
app.include_router(export_routes.router)


@app.on_event("startup")
async def startup():
    init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
