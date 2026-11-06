
from fastapi import FastAPI

app = FastAPI(
    title="AI Document Intelligence API",
    description="AI-powered PDF search and question answering with citations",
    version="1.0.0"
)

@app.get("/", tags=["General"])
def root():
    return {
        "message": "AI Document Intelligence API is running"
    }

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "AI Document Intelligence"
    }
