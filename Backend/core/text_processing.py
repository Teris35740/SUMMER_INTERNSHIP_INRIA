import re

import pymupdf


def clean_pdf_text(text):
    """Nettoie le texte brut extrait d'un PDF."""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    text = re.sub(r'(?m)^\d+\s*$', '', text)
    text = re.sub(r'(?m)^(Page|page)\s+\d+.*$', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def split_into_sentences(text):
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    sentence_pattern = r"(?<=[.!?])\s+(?=[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ])"
    sentences = re.split(sentence_pattern, text)

    cleaned_sentences = []
    for raw in sentences:
        s = raw.strip()
        if not s:
            continue
        cleaned_sentences.append(s)
    return cleaned_sentences


def extract_text_from_pdf(pdf_path):
    text = []
    with pymupdf.open(pdf_path) as doc:
        for page in doc:
            text.append(page.get_text())
    return "\n".join(text)


def extract_pages_from_pdf(pdf_path):
    pages = []
    with pymupdf.open(pdf_path) as doc:
        for page_number, page in enumerate(doc, start=1):
            raw_text = page.get_text()
            pages.append({
                "page_number": page_number,
                "text": clean_pdf_text(raw_text),
            })
    return pages
