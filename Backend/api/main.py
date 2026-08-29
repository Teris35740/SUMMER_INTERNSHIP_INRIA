import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from core.config import close_weaviate_client
from api.routers import patients, chat
from api.auth.router import router as auth_router

app = FastAPI(title="RAG Medical API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
def shutdown_event():
    close_weaviate_client()

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api", tags=["patients"])
app.include_router(chat.router, prefix="/api", tags=["chat"])

frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'Frontend')

@app.get("/")
def read_root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

app.mount("/", StaticFiles(directory=frontend_dir), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
