from fastapi import FastAPI
from app.routes.customer import router as customer_router
from app.routes.auth import router as auth_router
from app.routes.webhooks import router as webhooks_router

app = FastAPI(
    title="Vanella Water API",
    description="Backend API for the Vanella Water mobile application",
    version="1.0.0",
)

app.include_router(customer_router)
app.include_router(auth_router)
app.include_router(webhooks_router)

@app.get("/")
def root():
    return {
        "message": "Vanella Water API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "vanella-backend",
    }