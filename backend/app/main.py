from fastapi import FastAPI


app = FastAPI(
    title="Vanella Water API",
    description="Backend API for the Vanella Water mobile application",
    version="1.0.0",
)


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