import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

import weaviate.classes.query as wvq

from api.auth.dependencies import get_current_user, require_role
from core.config import WEAVIATE_COLLECTION, get_weaviate_client
from core.rag.chunking import build_chunk_records_from_pdf
from core.rag.embedding import embedding_db, store_in_weaviate
from db.models import ScientificDocument, User
from db.session import get_db

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[3]
DOCUMENT_DIR = BASE_DIR / "Document_scientifique"


def _serialize_document(document: ScientificDocument) -> dict:
    return {
        "id": str(document.id),
        "title": document.title,
        "file_name": document.file_name,
        "mime_type": document.mime_type,
        "file_size_bytes": document.file_size_bytes,
        "chunk_count": document.chunk_count,
        "chunks_count": document.chunk_count,
        "is_ingested": document.is_ingested,
        "created_at": document.created_at.isoformat(),
    }


def _delete_weaviate_chunks(source_tag: str) -> int:
    client = get_weaviate_client()

    if not client.collections.exists(WEAVIATE_COLLECTION):
        return 0

    collection = client.collections.get(WEAVIATE_COLLECTION)

    result = collection.data.delete_many(
        where=wvq.Filter.by_property("metadata_json").like(
            f"*{source_tag}*"
        )
    )

    return result.successful if hasattr(result, "successful") else 0


@router.post("/documents", status_code=201)
def upload_scientific_document(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    current_user: User = Depends(require_role("PROFESSOR")),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Seuls les fichiers PDF sont acceptés.",
        )

    original_name = Path(file.filename or "document.pdf").name

    if Path(original_name).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Le fichier doit être un PDF.",
        )

    DOCUMENT_DIR.mkdir(parents=True, exist_ok=True)

    existing = db.query(ScientificDocument).filter(ScientificDocument.file_name == original_name).first()
    if existing:
        _delete_weaviate_chunks(existing.weaviate_source_tag)
        db.delete(existing)
        db.commit()

    document_id = uuid.uuid4()
    source_tag = f"scientific_document:{document_id}"
    file_path = DOCUMENT_DIR / original_name

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        chunk_records = build_chunk_records_from_pdf(
            str(file_path),
            method="parent_child",
        )

        for record in chunk_records:
            record["weaviate_source_tag"] = source_tag

        chunk_count = len(chunk_records)

        if chunk_records:
            chunks = [record["content"] for record in chunk_records]
            embeddings = embedding_db(chunks)
            store_in_weaviate(chunk_records, embeddings)

        document = ScientificDocument(
            id=document_id,
            uploaded_by=current_user.id,
            title=title or Path(original_name).stem,
            file_path=str(file_path),
            file_name=original_name,
            mime_type=file.content_type,
            file_size_bytes=file_path.stat().st_size,
            weaviate_source_tag=source_tag,
            chunk_count=chunk_count,
            is_ingested=True,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return _serialize_document(document)

    except Exception as error:
        db.rollback()

        try:
            _delete_weaviate_chunks(source_tag)
        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'ingestion du document : {error}",
        )


@router.get("/documents")
def list_scientific_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    documents = (
        db.query(ScientificDocument)
        .order_by(ScientificDocument.created_at.desc())
        .all()
    )

    return [_serialize_document(document) for document in documents]


@router.delete("/documents/{document_id}")
def delete_scientific_document( document_id: uuid.UUID, current_user: User = Depends(require_role("PROFESSOR")), db: Session = Depends(get_db)):
    document = (db.query(ScientificDocument).filter(ScientificDocument.id == document_id).first())

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document scientifique introuvable.",
        )

    try:
        deleted_chunks = _delete_weaviate_chunks(document.weaviate_source_tag)

        file_path = Path(document.file_path)

        if file_path.exists():
            file_path.unlink()

        db.delete(document)
        db.commit()

        return {
            "id": str(document_id),
            "file_name": document.file_name,
            "status": "deleted",
            "deleted_chunks": deleted_chunks,
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression du document : {error}",
        )