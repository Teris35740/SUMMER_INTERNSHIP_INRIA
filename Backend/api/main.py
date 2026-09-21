import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from core.config import close_weaviate_client
from core.state.datalog_engine import close_engine
from api.routers import patients, chat, images, documents
from api.auth.router import router as auth_router

app = FastAPI(title="RAG Medical API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Preload models at startup so user requests never suffer from cold start latency
    from api.dependencies import get_models
    print("Preloading ML embedding and reranker models at startup...")
    get_models()
    print("Models successfully loaded and ready.")

@app.on_event("shutdown")
def shutdown_event():
    close_weaviate_client()
    close_engine()

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api", tags=["patients"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(images.router, prefix="/api", tags=["images"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'Frontend')

@app.get("/")
def read_root():
    if os.path.exists(os.path.join(frontend_dir, "index.html")):
        return FileResponse(os.path.join(frontend_dir, "index.html"))
    return {"status": "ok", "message": "MedSim API is running"}

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
