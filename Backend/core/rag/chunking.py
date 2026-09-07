import json
from pathlib import Path
from sentence_transformers import util

from ..config import get_model, get_tokenizer
from ..utils.text_processing import split_into_sentences, extract_pages_from_pdf


def semantic_chunking(text, model=None, tokenizer=None, max_tokens=250, similarity_threshold=0.65):
    '''
    1 - Vectorisez chaque phrase individuellement. 
    2 - Calculez la similarité entre les phrases adjacentes. 
    3 - Là où la similarité chute brutalement, insérez une limite de segment. 
    4 - Fusionnez les segments obtenus jusqu'à atteindre la taille cible.
    '''
    sentences = split_into_sentences(text)
    if not sentences:
        return []

    if model is None:
        model = get_model()
    if tokenizer is None:
        tokenizer = get_tokenizer()

    embeddings = model.encode(
        sentences,
        normalize_embeddings=True,
        convert_to_tensor=True,
        show_progress_bar=False,
    )

    chunks = []
    current_chunk = [sentences[0]]
    current_token_count = len(tokenizer.encode(sentences[0], add_special_tokens=False))

    for i in range(1, len(sentences)):
        sentence = sentences[i]
        sentence_token_count = len(tokenizer.encode(sentence, add_special_tokens=False))

        similarity = util.cos_sim(embeddings[i - 1], embeddings[i]).item()

        would_exceed_limit = current_token_count + sentence_token_count > max_tokens

        if similarity < similarity_threshold or would_exceed_limit:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_token_count = sentence_token_count
        else:
            current_chunk.append(sentence)
            current_token_count += sentence_token_count

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def fixed_size_chunking(text, chunk_size=250, overlap=50):
    '''Découper le texte en morceaux de taille fixe avec un chevauchement spécifié.'''
    words = text.split()
    chunks = []
    for i in range (0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks


def sentence_aware_chunking(text, chunk_size=250):
    '''
    Vérifier la taille du chunk initial : Si OK, retourner le chunk
    Essayer Séparateur 1 (Double Newline) : Diviser par \n\n, vérifier tous les chunks
    Si OK : Retourner les chunks
    Essayer Séparateur 2 (Single Newline) : Diviser par \n, vérifier tous les chunks
    Si OK : Retourner les chunks
    Essayer Séparateur 3 (Space) : Diviser par espace (mots)
    Si OK : Retourner les chunks
    Dernier recours : Forcer la division par caractère
    '''
    if len(text) <= chunk_size:
        return [text]
    
    separators = ["\n\n", "\n", " "]

    for sep in separators:
        chunks = text.split(sep)
        if all(len(chunk) <= chunk_size for chunk in chunks):
            return _merge_splits(chunks, sep, chunk_size)
    return _merge_splits(list(text), "", chunk_size)


def document_structure(text, separator="## "):
    '''Analysez le document pour identifier les marqueurs structurels 
    (par exemple, les en-têtes Markdown « ## », les balises HTML « <h2> » ou les titres de section PDF), 
    puis traitez chaque section comme un bloc unique.'''
    
    parts = text.split(separator)
    chunks = []
    
    for i, part in enumerate(parts):
        part = part.strip()
        if not part:
            continue
        
        if i > 0 or text.startswith(separator):
            chunk = separator + part
        else:
            chunk = part
            
        chunks.append(chunk)
        
    return chunks


def parent_child_chunking(text, parent_chunk_size=1000):
    '''
    Découpe le texte en blocs parents (ex: paragraphes), puis en phrases (enfants).
    Idéal pour le Small-to-Big Retrieval. Retourne une structure détaillée.
    '''
    parents = sentence_aware_chunking(text, chunk_size=parent_chunk_size)
    
    parent_child_records = []
    for parent_id, parent_text in enumerate(parents):
        children = split_into_sentences(parent_text)
        
        for child_id, child_text in enumerate(children):
            parent_child_records.append({
                "content": child_text,         # L'enfant (utilisé pour l'embedding et la recherche)
                "parent_content": parent_text, # Le parent (qui sera renvoyé au LLM via les métadonnées)
                "parent_id": parent_id,
                "child_id": child_id
            })
            
    return parent_child_records


def build_chunk_records_from_pdf(pdf_path, method="parent_child", model=None, tokenizer=None, max_tokens=250, similarity_threshold=0.65):
    '''
    Génère les records de chunks selon la méthode choisie ('semantic', 'fixed', 'sentence', 'structure', 'parent_child').
    '''
    pdf_name = Path(pdf_path).name
    chunk_records = []

    if model is None:
        model = get_model()
    if tokenizer is None:
        tokenizer = get_tokenizer()

    for page in extract_pages_from_pdf(pdf_path):
        page_text = page["text"]
        
        if method == "semantic":
            page_chunks = semantic_chunking(page_text, model=model, tokenizer=tokenizer, max_tokens=max_tokens, similarity_threshold=similarity_threshold)
        elif method == "fixed":
            page_chunks = fixed_size_chunking(page_text, chunk_size=max_tokens)
        elif method == "sentence":
            page_chunks = sentence_aware_chunking(page_text, chunk_size=max_tokens)
        elif method == "structure":
            page_chunks = document_structure(page_text)
        elif method == "parent_child":
            records = parent_child_chunking(page_text)
            for record in records:
                record.update({
                    "source_type": "reference",
                    "source_file": pdf_name,
                    "page_number": page["page_number"]
                })
                chunk_records.append(record)
            continue
        else:
            raise ValueError(f"Méthode de chunking inconnue : {method}")

        for chunk_index, chunk in enumerate(page_chunks, start=1):
            chunk_records.append({
                "content": chunk,
                "source_type": "reference",
                "source_file": pdf_name,
                "page_number": page["page_number"],
                "chunk_index": chunk_index,
            })

    return chunk_records


def build_chunk_records_from_dict(doc, source_file="database"):
    '''Génère les records de chunks à partir d'un dictionnaire patient structuré.'''
    chunk_records = []

    if "patient" in doc:
        patient_data = doc["patient"]
        identity = patient_data.get("identity", {})
        patient_id = identity.get("patient_id", "unknown")
        age = identity.get("age", "inconnu")
        gender = identity.get("gender", "inconnu")
        patient_attitude = identity.get("patient_attitude", {"anxiety": 0.5, "precision": 0.5, "cooperativeness": 0.8})
    else:
        patient_data = doc
        patient_id = doc.get("patient_id", "unknown")
        identity = doc.get("identity", {})
        age = identity.get("age", "inconnu")
        gender = identity.get("sex", "inconnu")
        patient_attitude = identity.get("patient_attitude", {"anxiety": 0.5, "precision": 0.5, "cooperativeness": 0.8})

    context_prefix = f"Patient {patient_id} ({gender}, {age} ans, attitude: anxiété={patient_attitude['anxiety']}, précision={patient_attitude['precision']}, coopérativité={patient_attitude['cooperativeness']})"

    categories = [
        "chief_complaint", "history", "treatments", "vitals", "allergies", 
        "past_medical_history", "family_history", 
        "surgical_history", "travel_history", 
        "social_history", "risk_factors"
    ]
    
    chunk_index = 1
    
    for category in categories:
        if category in patient_data:
            category_data = patient_data[category]
            
            facts = category_data if isinstance(category_data, list) else [category_data]
            
            for fact in facts:
                fact_text = fact.get("information") or fact.get("text", "")
                if not fact_text:
                    continue
                
                fact_id = fact.get("fact_id", f"{category}_{chunk_index}")
                
                category_name_fr = category.replace('_', ' ').capitalize()
                
                enriched_content = f"{context_prefix} - Catégorie [{category_name_fr}] : {fact_text}"
                
                chunk_records.append({
                    "content": enriched_content,       
                    "source_type": "patient",
                    "source_file": source_file,
                    "patient_id": patient_id,
                    "fact_id": fact_id,              
                    "reveal_policy": fact.get("reveal_policy", "unknown"),
                    "chunk_index": chunk_index,
                    "raw_fact": fact_text              
                })
                chunk_index += 1
                
    return chunk_records


def build_chunk_records_from_json(json_path):
    '''Génère les records de chunks à partir d'un fichier JSON structuré pour les patients.'''
    json_name = Path(json_path).name
    with open(json_path, "r", encoding="utf-8") as file:
        doc = json.load(file)
    return build_chunk_records_from_dict(doc, source_file=json_name)


def _merge_splits(splits, separator, chunk_size):
    '''Fusionne les segments de texte en chunks de taille maximale spécifiée, en utilisant le séparateur donné.'''
    chunks = []
    current_splits = []
    current_len = 0

    for split in splits:
        split_len = len(split)
        sep_len = len(separator) if current_splits else 0

        if current_len + split_len + sep_len > chunk_size and current_splits:
            chunks.append(separator.join(current_splits))
            current_splits = [split]
            current_len = split_len
        else:
            current_splits.append(split)
            current_len += split_len + sep_len

    if current_splits:
        chunks.append(separator.join(current_splits))

    return chunks