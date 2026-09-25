from fastapi import FastAPI
from app.routes.customer import router as customer_router


app = FastAPI(
    title="Vanella Water API",
    description="Backend API for the Vanella Water mobile application",
    version="1.0.0",
)

app.include_router(customer_router)

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