
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, documents, search, qa

app = FastAPI(
    title="AI Document Intelligence API",
    description=(
        "AI-powered PDF search and question "
        "answering with citations"
    ),
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 3 - Authentication
app.include_router(
    auth.router,
    prefix="/api/v1",
)

# Phase 4 and 5 - Documents and indexing
app.include_router(
    documents.router,
    prefix="/api/v1",
)

# Phase 5 - Semantic search
app.include_router(
    search.router,
    prefix="/api/v1",
)

# Phase 6 - RAG question answering
app.include_router(
    qa.router,
    prefix="/api/v1",
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
        "service": "AI Document Intelligence",
    }
