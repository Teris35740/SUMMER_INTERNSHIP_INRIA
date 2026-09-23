# Ingestion et benchmarks

## Script d'ingestion

Le script [`ingest.py`](../Backend/ingest.py) indexe les documents dans Weaviate. Il traite deux types de sources :

```python
# ingest.py — flux principal
def main():
    # 1. Ingestion des dossiers patients (JSON)
    patient_files = glob.glob("../Document_patient/patient_*.json")
    for json_path in sorted(patient_files):
        chunk_records = build_chunk_records_from_json(json_path)
        embeddings = embedding_db(chunks)
        store_in_weaviate(chunk_records, embeddings)

    # 2. Ingestion des documents scientifiques (PDF)
    pdf_files = glob.glob("../Document_scientifique/*.pdf")
    for pdf_path in sorted(pdf_files):
        chunk_records = build_chunk_records_from_pdf(pdf_path, method="parent_child")
        embeddings = embedding_db(chunks)
        store_in_weaviate(chunk_records, embeddings)
```

### Exécution

```bash
cd Backend
source ../venv/bin/activate
python ingest.py
```

Durée approximative : **5-15 minutes** pour ~100 patients + 9 PDFs, selon la machine.

---

## Format des dossiers patients

Chaque fichier `Document_patient/patient_XX.json` est un JSON structuré :

```json
{
  "patient": {
    "identity": {
      "patient_id": "PAT_001",
      "age": 41,
      "gender": "homme",
      "patient_attitude": { "anxiety": 0.6, "precision": 0.8, "cooperativeness": 0.9 }
    },
    "chief_complaint": {
      "information": "Dos complètement bloqué, impossibilité de se redresser.",
      "reveal_policy": "direct_if_asked",
      "fact_id": "cc1"
    },
    "history": [
      {
        "information": "Déclenchement : La douleur est apparue d'un coup sec...",
        "reveal_policy": "direct_if_asked_about_onset",
        "fact_id": "h1"
      },
      {
        "information": "Intensité (Échelle 1 à 10) : 8/10 au moment du blocage...",
        "reveal_policy": "only_if_pain_scale_asked",
        "fact_id": "h2"
      }
    ],
    "vitals": [ ... ],
    "allergies": [ ... ],
    "past_medical_history": [ ... ],
    "treatments": [ ... ],
    "family_history": [ ... ],
    "social_history": [ ... ],
    "travel_history": [ ... ],
    "risk_factors": [ ... ],
    "surgical_history": [ ... ]
  },
  "metadata": {
    "difficulty": "facile",
    "specialty": "Rhumatologie",
    "expected_diagnosis": "Lombalgie aiguë mécanique",
    "alternative_diagnoses": ["Sciatique", "Hernie discale"],
    "red_flags": ["Syndrome de la queue de cheval", "Fracture vertébrale"],
    "expected_treatment": {
      "molecules": [
        {"name": "Paracétamol", "dosage": "1g x3/j", "route": "orale", "duration": "5 jours"}
      ],
      "contraindications_to_check": ["insuffisance hépatique"]
    }
  }
}
```

Chaque fait médical porte :
- **`information`** : le texte du fait
- **`reveal_policy`** : la politique de révélation (voir [03-moteur-datalog.md](03-moteur-datalog.md))
- **`fact_id`** : identifiant unique pour le contrôle d'accès et la traçabilité

---

## Chunking des patients

```python
# chunking.py — build_chunk_records_from_dict()
# Chaque fait médical devient un chunk avec enrichissement contextuel :
enriched_content = f"{context_prefix} - Catégorie [{category_name}] : {fact_text}"
# Exemple :
# "Patient PAT_001 (homme, 41 ans, attitude: anxiété=0.6, précision=0.8, 
#  coopérativité=0.9) - Catégorie [History] : Déclenchement : La douleur..."
```

Les chunks patients **ne sont pas découpés** — chaque fait est un chunk unique. L'enrichissement contextuel (patient_id, âge, genre, attitude) améliore la recherche vectorielle en ajoutant du contexte au vecteur.

Chaque chunk contient les metadata suivantes (sérialisées en JSON dans Weaviate) :

| Champ | Exemple | Utilité |
|:------|:--------|:--------|
| `source_type` | `"patient"` | Pondération RRF (λ = 1.3) |
| `patient_id` | `"PAT_001"` | Filtrage par patient |
| `fact_id` | `"h1"` | Contrôle d'accès Datalog |
| `reveal_policy` | `"only_if_pain_scale_asked"` | Règles du moteur d'état |
| `raw_fact` | `"Intensité : 8/10..."` | Texte brut sans enrichissement |

---

## Chunking des PDFs

Les documents scientifiques utilisent la méthode **parent-child** (Small-to-Big Retrieval) :

```python
# chunking.py — parent_child_chunking()
def parent_child_chunking(text, parent_chunk_size=1000):
    # 1. Découpe en blocs parents (paragraphes, ~1000 chars)
    parents = sentence_aware_chunking(text, chunk_size=parent_chunk_size)
    # 2. Découpe chaque parent en phrases (enfants)
    for parent_text in parents:
        children = split_into_sentences(parent_text)
        for child_text in children:
            records.append({
                "content": child_text,           # Enfant → embedding + recherche
                "parent_content": parent_text,   # Parent → contexte pour le LLM
            })
```

**Principe** : les enfants (phrases individuelles) sont indexés pour la recherche vectorielle (granularité fine), mais au moment de construire le contexte pour le LLM, le contenu est remplacé par celui du parent (contexte large) via `expansion_parent_child()` dans `reranking.py`.

### Les 5 méthodes de chunking implémentées

| Méthode | Description | Utilisée pour |
|:--------|:------------|:--------------|
| `semantic_chunking` | Vectorise chaque phrase, coupe quand la similarité cosinus chute sous le seuil (0.65) | Benchmark uniquement |
| `fixed_size_chunking` | Blocs de taille fixe (250 mots) avec chevauchement (50 mots) | Benchmark uniquement |
| `sentence_aware_chunking` | Découpage par séparateurs (`\n\n` → `\n` → ` `) avec fusion jusqu'à la taille cible | Sous-composant du parent-child |
| `document_structure` | Découpage par marqueurs structurels (ex. : `## ` pour Markdown) | Benchmark uniquement |
| **`parent_child_chunking`** | Parents (paragraphes) → enfants (phrases). Small-to-Big Retrieval | **Méthode retenue** pour les PDFs |

---

## Stockage dans Weaviate

```python
# embedding.py — store_in_weaviate()
with collection.batch.dynamic() as batch:
    for record, emb in zip(chunk_records, embs):
        properties = {
            "content": content,
            "source_type": source_type,                          # "patient" ou "reference"
            "metadata_json": json.dumps(record_data, ensure_ascii=False),  # Tout le reste
        }
        batch.add_object(
            properties=properties,
            vector=emb.tolist(),    # Vecteur 768d (BGE-base)
        )
```

La collection `MedicalDocuments` est créée automatiquement si elle n'existe pas (`_ensure_collection_exists()`).

### Gestion des doublons

L'ingestion **n'a pas de mécanisme de déduplication**. Relancer `ingest.py` sans vider Weaviate crée des doublons. Pour réingérer proprement :

```bash
docker compose down -v          # Supprime le volume Weaviate
docker compose up -d            # Recréer le conteneur
cd Backend && python ingest.py  # Réingérer
```

Pour les documents scientifiques ajoutés via l'interface (route `/api/documents`), la suppression passe par le `weaviate_source_tag` unique.

---

## Benchmarks

Le dossier `Benchmark/` contient les scripts d'évaluation comparative des composants du pipeline RAG.

### Benchmark des modèles d'embedding

Utilise le framework [MTEB](https://github.com/embeddings-benchmark/mteb) (Massive Text Embedding Benchmark).

```python
# benchmark_embedding.py — modèles évalués
model_configs = [
    {"name": "BGE-Base",     "id": "BAAI/bge-base-en-v1.5"},
    {"name": "PubMedBert",   "id": "pritamdeka/S-PubMedBert-MS-MARCO"},
    {"name": "MedCPT",       "query_id": "ncbi/MedCPT-Query-Encoder",
                             "article_id": "ncbi/MedCPT-Article-Encoder"},
    {"name": "BioLORD-2023", "id": "FremyCompany/BioLORD-2023-M"},
    {"name": "BioBERT",      "id": "dmis-lab/biobert-v1.1"},
]
```

**Datasets utilisés** :
- **MedicalQARetrieval** : paires question-réponse médicales
- **NFCorpus** : corpus de documents biomédicaux (NF = Nutrition Facts)
- **SciFact** : vérification de faits scientifiques

Les résultats sont stockés dans `results_MedicalQARetrieval/`, `results_NFCorpus/`, `results_SciFact/`.

**Choix final** : `BAAI/bge-base-en-v1.5` — bon compromis performance/taille. Meilleur sur MedicalQARetrieval que les modèles biomédicaux spécialisés (BioLORD, BioBERT). MedCPT utilise un encodeur dual (query + article) incompatible avec notre architecture mono-encodeur pour l'indexation.

#### Exécution

```bash
cd Benchmark
python benchmark_embedding.py    # Évalue sur MedicalQARetrieval
```

Pour évaluer sur d'autres datasets, modifier `medical_tasks` dans le script.

---

### Benchmark des rerankers

Évalue 3 cross-encoders sur un cas de test médical avec 5 documents candidats (1 pertinent, 4 distracteurs) :

```python
# benchmark_rerankers.py — modèles évalués
cross_encoders = {
    "MedCPT-Cross-Encoder":  "ncbi/MedCPT-Cross-Encoder",
    "BiomedBERT-Reranker":   "NeuML/biomedbert-base-reranker",
    "BGE-Reranker-Base":     "BAAI/bge-reranker-base",
}
```

**Choix final** : `ncbi/MedCPT-Cross-Encoder` — spécialisé biomédical, discrimine bien les documents pertinents des distracteurs dans le contexte clinique.

#### Exécution

```bash
cd Benchmark
python benchmark_rerankers.py
```

---

### Benchmark du chunking

Compare les 5 méthodes de chunking sur les documents scientifiques du projet :

```bash
cd Benchmark
python benchmark_chunking.py
```

Les résultats sont dans `results_Chunking/`. Le benchmark mesure la qualité de la recherche (recall, précision) pour chaque méthode.

**Choix final** : `parent_child_chunking` — meilleur compromis entre granularité de recherche (phrases individuelles) et qualité du contexte fourni au LLM (paragraphes complets).

---

### Récapitulatif des choix

| Composant | Choix retenu | Alternatives testées | Justification |
|:----------|:-------------|:---------------------|:--------------|
| Embedding | `BAAI/bge-base-en-v1.5` (768d) | BioLORD-2023, MedCPT, BioBERT, PubMedBert | Meilleur nDCG sur MedicalQARetrieval, taille raisonnable |
| Reranker | `ncbi/MedCPT-Cross-Encoder` | BiomedBERT-Reranker, BGE-Reranker-Base | Spécialisé biomédical, meilleure discrimination |
| Chunking PDFs | Parent-child (1000 chars parent) | Semantic, fixed, sentence, structure | Small-to-Big : recherche fine + contexte large |
| Chunking patients | Fait unitaire enrichi | — | Chaque fait médical = 1 chunk (pas de découpage) |
| LLM | Gemini Flash Lite | — | Structured output natif, coût faible, latence basse |

---

**Fichiers de référence** : [`ingest.py`](../Backend/ingest.py) · [`chunking.py`](../Backend/core/rag/chunking.py) · [`embedding.py`](../Backend/core/rag/embedding.py) · [`benchmark_embedding.py`](../Benchmark/benchmark_embedding.py) · [`benchmark_rerankers.py`](../Benchmark/benchmark_rerankers.py)

← Retour : [00-vue-ensemble.md](00-vue-ensemble.md)
