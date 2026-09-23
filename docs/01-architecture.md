# Architecture

## Vue globale

```mermaid
flowchart TB
    subgraph Frontend["Frontend Next.js (port 3000)"]
        UI[Interface utilisateur]
        AuthCtx[Contexte Auth]
        MedsimHook[Hook use-medsim]
        APIClient[Client API lib/api.ts]
    end

    subgraph Backend["Backend FastAPI (port 8000)"]
        direction TB
        API[API Layer<br>routers/ + schemas.py]
        Services[Orchestrateur<br>services.py]
        
        subgraph CoreRAG["Pipeline RAG"]
            Analyze[Analyse question<br>llm_gem.py]
            Retrieval[Recherche hybride<br>retrieval.py]
            Reranking[Reranking MedCPT<br>reranking.py]
        end
        
        subgraph CoreState["Contrôle d'accès"]
            StateMotor[State Motor<br>state_motor.py]
            DatalogEngine[Moteur Datalog<br>datalog_engine.py]
            Verification[Vérification<br>verification.py]
        end
        
        subgraph CoreEval["Évaluation"]
            Diagnostic[diagnostic.py]
            Prescription[prescription.py]
            Scoring[scoring.py]
        end
        
        LLM[Gemini LLM<br>llm_gem.py]
        Cache[Cache session<br>cache.py]
        Vignette[Vignette clinique<br>vignette.py]
    end

    subgraph Infra["Infrastructure Docker"]
        PG[(PostgreSQL 16<br>port 5432)]
        WV[(Weaviate 1.30<br>port 8080)]
    end

    subgraph Models["Modèles ML"]
        Embed[BGE-base-en-v1.5<br>embedding 768d]
        CrossEnc[MedCPT Cross-Encoder<br>reranking]
        Gemini[Google Gemini<br>gemini-flash-lite]
    end

    UI --> APIClient
    APIClient -->|REST JSON| API
    API --> Services
    Services --> Analyze
    Services --> Retrieval
    Services --> Reranking
    Services --> StateMotor
    StateMotor --> DatalogEngine
    Services --> LLM
    Services --> Verification
    Services --> Cache
    Services --> Vignette

    API --> CoreEval

    Retrieval --> WV
    Retrieval --> Embed
    Reranking --> CrossEnc
    LLM --> Gemini
    Analyze --> Gemini
    Prescription --> Gemini

    API --> PG
```

---

## Composants et responsabilités

### Frontend (Next.js 16 / TypeScript)

Le frontend est un consommateur de l'API REST. Il n'embarque aucune logique métier.

| Fichier | Responsabilité |
|:--------|:---------------|
| `app/page.tsx` | Page d'accueil : sélection du patient, filtrage par spécialité/difficulté |
| `app/patients/nouveau/` | Formulaire multi-étapes de création de patient |
| `components/chat/` | Interface de chat (messages, input, affichage pipeline debug) |
| `components/clinical-sidebar.tsx` | Vignette clinique : résumé structuré des faits révélés |
| `components/diagnosis-modal.tsx` | Modal de saisie du diagnostic + différentiels |
| `components/navbar.tsx` | Navigation, sélection patient, chronomètre |
| `hooks/use-medsim.ts` | Hook principal : état de la consultation, appels API (`/ask`, `/diagnose`, `/prescribe`) |
| `context/auth-context.tsx` | Gestion du token JWT, état de connexion |
| `lib/api.ts` | Client fetch avec injection automatique du token Bearer |
| `types/api.ts` | Interfaces TypeScript miroir des schémas Pydantic backend |

**Communication** : toutes les requêtes passent par `lib/api.ts` → `http://localhost:8000/api/*`. Le token JWT est stocké côté client et injecté dans le header `Authorization`.

---

### Backend (FastAPI / Python)

Le backend est organisé en 4 couches :

```
api/          → Routes HTTP, schémas Pydantic, authentification
core/rag/     → Pipeline RAG (chunking, embedding, retrieval, reranking)
core/state/   → Moteur d'état Datalog, vérification post-génération
core/eval/    → Évaluation (diagnostic, prescription, scoring)
core/llms/    → Communication avec Google Gemini
core/utils/   → Cache session, helpers, text processing
db/           → Modèles SQLAlchemy, session, initialisation
```

#### Couche API (`api/`)

| Module | Responsabilité | Entrées | Sorties |
|:-------|:---------------|:--------|:--------|
| `main.py` | Point d'entrée FastAPI, CORS, preload modèles ML au startup, shutdown Weaviate + Datalog | — | — |
| `services.py` | Orchestration complète du pipeline `/ask` (10 étapes) | `AskRequest` | `AskResponse` |
| `schemas.py` | ~20 modèles Pydantic (requêtes/réponses) | — | — |
| `routers/chat.py` | Routes `/ask`, `/diagnose`, `/prescribe`, `/clear` | Requêtes JSON | Réponses JSON |
| `routers/patients.py` | CRUD patients (création, listing, suppression, groupement par spécialité) | — | — |
| `routers/documents.py` | Upload, listing, suppression de documents scientifiques + ingestion Weaviate | — | — |
| `routers/images.py` | Upload et serving d'images médicales associées aux patients | — | — |
| `auth/router.py` | Inscription, connexion, refresh, `/auth/me` | — | JWT token |
| `auth/utils.py` | Hachage bcrypt, création/décodage JWT (HS256, 24h) | — | — |

#### Couche RAG (`core/rag/`)

Voir le document dédié : [02-pipeline-rag.md](02-pipeline-rag.md)

| Module | Responsabilité | Dépendances |
|:-------|:---------------|:------------|
| `chunking.py` | 5 méthodes de découpage (semantic, fixed, sentence, structure, parent-child) | `sentence_transformers`, `text_processing.py` |
| `embedding.py` | Vectorisation + stockage dans Weaviate | `sentence_transformers`, Weaviate client |
| `retrieval.py` | Recherche vectorielle + BM25 + fusion hybride RRF stratifiée | Weaviate client |
| `reranking.py` | Reranking cross-encoder, expansion parent-child, construction du contexte LLM | MedCPT Cross-Encoder |

#### Couche État (`core/state/`)

Voir le document dédié : [03-moteur-datalog.md](03-moteur-datalog.md)

| Module | Responsabilité | Dépendances |
|:-------|:---------------|:------------|
| `datalog_engine.py` | Singleton moteur Datalog, domaine `medical_access_control`, 7 prédicats EDB, 5 règles | `maelys_datalog` (binding Python) |
| `state_motor.py` | Filtrage des faits RAG (3 variantes : simple, advanced, datalog) | `datalog_engine.py` |
| `verification.py` | Vérification post-génération, dictionnaire de synonymes médicaux | — |

#### Couche Évaluation (`core/evaluation/`)

Voir le document dédié : [04-evaluation-et-scoring.md](04-evaluation-et-scoring.md)

| Module | Responsabilité | Dépendances |
|:-------|:---------------|:------------|
| `diagnostic.py` | Orchestration de l'évaluation du diagnostic | `verification.py`, `scoring.py`, `cache.py` |
| `prescription.py` | Évaluation de la prescription via LLM + rapport final | `llm_gem.py`, `scoring.py`, `cache.py` |
| `scoring.py` | Calcul des 5 indicateurs + score final + rapport formaté | `config.py` (poids, ordre idéal) |

#### Utilitaires (`core/utils/`, `core/llms/`, `core/clinical/`)

| Module | Responsabilité |
|:-------|:---------------|
| `cache.py` | Cache de session en mémoire (dict Python) : historique, topics, faits révélés, chronomètre |
| `helpers.py` | Chargement des données patient depuis les fichiers JSON |
| `text_processing.py` | Nettoyage texte PDF, découpage en phrases (regex) |
| `llm_gem.py` | Intégration Google Gemini : génération réponse patient, analyse question, évaluation pédagogique, évaluation prescription |
| `vignette.py` | Génération de vignette clinique (résumé par section des faits révélés) |

---

### Base de données PostgreSQL

Le schéma comporte 4 tables. Les données de session (historique, topics, faits révélés) ne sont **pas** en base — elles sont en mémoire dans `cache.py`.

```mermaid
erDiagram
    User ||--o{ Patient : "created_by"
    User ||--o{ PatientImage : "uploaded_by"
    User ||--o{ ScientificDocument : "uploaded_by"
    Patient ||--o{ PatientImage : "patient_id"

    User {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        UserRole role
        bool is_active
        datetime created_at
        datetime updated_at
    }

    Patient {
        uuid id PK
        string patient_id UK "PAT_001, PAT_002..."
        uuid created_by FK
        jsonb patient_data "Dossier médical complet"
        bool is_temporary "48h pour STUDENT"
        datetime expires_at
        string difficulty
        string specialty
        datetime created_at
        datetime updated_at
    }

    PatientImage {
        uuid id PK
        uuid patient_id FK
        uuid uploaded_by FK
        string fact_id "Lien vers le fait médical"
        string image_type
        string file_path
        string file_name
        string mime_type
        int file_size_bytes
        string description
        string reveal_policy "direct_if_asked par défaut"
        datetime created_at
    }

    ScientificDocument {
        uuid id PK
        uuid uploaded_by FK
        string title
        string file_path
        string file_name
        string mime_type
        int file_size_bytes
        string weaviate_source_tag UK
        int chunk_count
        bool is_ingested
        datetime created_at
    }
```

#### Points importants

- **`patient_data`** (JSONB) : contient l'intégralité du dossier médical structuré (identité, antécédents, symptômes, constantes, metadata). C'est cette donnée qui est chunkée et indexée dans Weaviate.
- **`is_temporary`** : les étudiants (STUDENT) ne peuvent créer que des patients temporaires (supprimés après 48h). Les professeurs (PROFESSOR) créent des patients permanents.
- **`weaviate_source_tag`** : identifiant unique dans Weaviate pour retrouver et supprimer les chunks d'un document scientifique.
- **Enum `UserRole`** : deux valeurs — `STUDENT` et `PROFESSOR`.

#### Initialisation

```bash
cd Backend
python -m db.init_db
```

Cela exécute `Base.metadata.create_all(engine)` — SQLAlchemy crée les tables si elles n'existent pas. Pas de système de migration (Alembic n'est pas utilisé).

#### Réinitialisation (développement)

```bash
docker compose down -v    # Supprime les volumes PostgreSQL + Weaviate
docker compose up -d      # Recrée les conteneurs
cd Backend
python -m db.init_db      # Recrée les tables
python ingest.py          # Réingère les documents
```

> **Attention** : `docker compose down -v` supprime aussi les données Weaviate. Il faut relancer l'ingestion.

---

### Base vectorielle Weaviate

Weaviate 1.30 est utilisé comme base vectorielle. La configuration est définie dans `docker-compose.yml` :

| Paramètre | Valeur |
|:-----------|:-------|
| Image | `cr.weaviate.io/semitechnologies/weaviate:1.30.0` |
| Ports | REST : 8080, gRPC : 50051 |
| Vectorizer | `none` (embeddings fournis par le backend) |
| Authentification | Accès anonyme activé (développement) |
| Persistance | Volume Docker `weaviate_data` |
| Collection | `MedicalDocuments` (créée automatiquement à l'ingestion) |

#### Schéma de la collection

La collection `MedicalDocuments` contient 3 propriétés + le vecteur :

```python
# embedding.py — _ensure_collection_exists()
properties=[
    Property(name="content",       data_type=DataType.TEXT),    # Texte du chunk
    Property(name="source_type",   data_type=DataType.TEXT),    # "patient" ou "reference"
    Property(name="metadata_json", data_type=DataType.TEXT),    # JSON sérialisé (fact_id, reveal_policy, page, etc.)
]
# + vecteur 768 dimensions (BAAI/bge-base-en-v1.5)
```

Les metadata sont sérialisées en JSON string car Weaviate ne supporte pas les objets imbriqués aussi facilement que PostgreSQL JSONB. Elles sont parsées au retour dans `retrieval.py` → `_parse_weaviate_object()`.

---

### Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: medsim
      POSTGRES_PASSWORD: medsim_password
      POSTGRES_DB: medsim
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medsim -d medsim"]

  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.30.0
    ports: ["8080:8080", "50051:50051"]
    environment:
      DEFAULT_VECTORIZER_MODULE: 'none'
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
    volumes: [weaviate_data:/var/lib/weaviate]
```

Les deux services sont indépendants — ils n'ont pas de lien réseau entre eux. Le backend communique avec chacun séparément.

---

### Variables d'environnement

#### Backend (`Backend/.env`)

| Variable | Obligatoire | Description | Valeur par défaut |
|:---------|:-----------:|:------------|:------------------|
| `GEMINI_API_KEY` | ✅ | Clé API Google Gemini pour le LLM (génération, prescription) | — |
| `GEMINI_API_KEY_QUESTION_ANALYSIS` | ✅ | Clé Gemini dédiée à l'analyse des questions (peut être la même) | — |
| `DATABASE_URL` | ✅ | URL PostgreSQL (format `postgresql+psycopg://user:pass@host:port/db`) | — |
| `JWT_SECRET_KEY` | ✅ | Clé secrète pour la signature des tokens JWT (HS256) | `super-secret-key-change-me` |
| `WEAVIATE_URL` | ❌ | URL du serveur Weaviate | `http://localhost:8080` |
| `WEAVIATE_API_KEY` | ❌ | Clé API Weaviate (vide = accès anonyme) | `""` |
| `WEAVIATE_COLLECTION` | ❌ | Nom de la collection Weaviate | `MedicalDocuments` |
| `EXCERPT_COUNT` | ❌ | Nombre de chunks retenus après reranking | `50` |
| `MAX_RETRIES` | ❌ | Nombre de tentatives en cas d'échec de vérification LLM | `3` |

#### Frontend (`medsim-frontend/.env.local`)

| Variable | Description | Valeur par défaut |
|:---------|:------------|:------------------|
| `NEXT_PUBLIC_API_URL` | URL de l'API Backend | `http://localhost:8000/api` |

---

### Gestion des sessions en mémoire

Les sessions de consultation ne sont pas en base de données. Elles sont maintenues dans un dict Python global dans `cache.py` :

```python
# cache.py — structure d'une session
cache[session_id] = {
    "messages": [],           # Historique des messages (user/assistant)
    "question_count": 0,      # Nombre de questions posées
    "useful_question_count": 0,
    "useful_questions_list": [],
    "start_timestamp": "...", # ISO 8601 — pour le chronomètre
    "state": {
        "revealed_facts": [], # fact_ids déjà révélés
        "asked_topics": [],   # Topics explorés (listes de target_slots)
        "patient_attitude": { # Personnalité du patient
            "anxiety": 0.5,
            "precision": 0.5,
            "cooperativeness": 0.8
        },
        "exam_results_unlocked": False
    },
    "diagnosis_result": None  # Stocké entre /diagnose et /prescribe
}
```

> **Limite** : un redémarrage du backend perd toutes les sessions en cours. Pour la production, migrer vers Redis.

---

**Fichiers de référence** : [`main.py`](../Backend/api/main.py) · [`models.py`](../Backend/db/models.py) · [`docker-compose.yml`](../docker-compose.yml) · [`cache.py`](../Backend/core/utils/cache.py)

→ Suite : [02-pipeline-rag.md](02-pipeline-rag.md)
