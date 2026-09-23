# MedSim — Simulateur de Consultation Médicale par RAG

**MedSim** est une plateforme de simulation de consultation médicale destinée aux étudiants en médecine. L'étudiant interagit avec un patient virtuel via un chat, pose des questions d'anamnèse, propose un diagnostic et rédige une prescription. L'ensemble est piloté par un pipeline **RAG (Retrieval-Augmented Generation)** qui s'appuie sur des documents médicaux scientifiques et des dossiers patients structurés.

> **Stage IRISA 2026** — Projet de recherche à l'IRISA Rennes

---

## Table des matières

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
  - [1. Cloner le dépôt](#1-cloner-le-dépôt)
  - [2. Services Docker (PostgreSQL + Weaviate)](#2-services-docker-postgresql--weaviate)
  - [3. Backend Python](#3-backend-python)
  - [4. Frontend Next.js](#4-frontend-nextjs)
- [Configuration](#configuration)
  - [Variables d'environnement Backend](#variables-denvironnement-backend)
  - [Variables d'environnement Frontend](#variables-denvironnement-frontend)
- [Lancer le projet](#lancer-le-projet)
- [Ingestion des données](#ingestion-des-données)
- [Première utilisation](#première-utilisation)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [Stack technique](#stack-technique)
- [Benchmarks](#benchmarks)
- [Documentation technique](#documentation-technique)
- [Dépannage](#dépannage)

---

## Architecture

```
┌─────────────────────┐      ┌────────────────────────┐
│   Frontend Next.js  │◄────►│   Backend FastAPI       │
│   (port 3000)       │ REST │   (port 8000)           │
└─────────────────────┘      └────┬──────────┬─────────┘
                                  │          │
                    ┌─────────────┘          └──────────────┐
                    ▼                                       ▼
          ┌──────────────────┐                  ┌───────────────────┐
          │   PostgreSQL 16  │                  │   Weaviate 1.30   │
          │   (port 5432)    │                  │   (port 8080)     │
          │   Données        │                  │   Base vectorielle│
          │   relationnelles │                  │   (embeddings)    │
          └──────────────────┘                  └───────────────────┘
                                                        ▲
                                                        │
                                              ┌─────────┴─────────┐
                                              │  Modèles ML       │
                                              │  - BGE-base-en    │
                                              │  - MedCPT (rerank)│
                                              │  - Gemini (LLM)   │
                                              └───────────────────┘
```

---

## Prérequis

| Outil        | Version minimale | Vérification              |
|:-------------|:-----------------|:--------------------------|
| **Python**   | 3.12+            | `python --version`        |
| **Node.js**  | 18+              | `node --version`          |
| **npm**      | 9+               | `npm --version`           |
| **Docker**   | 24+              | `docker --version`        |
| **Docker Compose** | v2+        | `docker compose version`  |
| **Git**      | 2.30+            | `git --version`           |
| **CMake**    | 3.20+            | `cmake --version`         |
| **Compilateur C** | C11 (GCC 9+ ou Clang 11+) | `gcc --version` ou `clang --version` |

> **Note GPU** : Les modèles d'embedding (`BAAI/bge-base-en-v1.5`) et le cross-encoder (`ncbi/MedCPT-Cross-Encoder`) utilisent PyTorch. Un GPU n'est pas obligatoire mais accélère significativement l'inférence. Sans GPU, le backend fonctionne sur CPU.

---

## Installation

### 1. Cloner le dépôt et ses sous-modules

Le projet intègre le moteur Datalog [maelys-datalog](https://github.com/maelys-dev/maelys-datalog) sous forme de sous-module Git. Utilisez l'option `--recurse-submodules` pour le cloner automatiquement avec le projet :

```bash
git clone --recurse-submodules https://github.com/Teris35740/SUMMER_INTERNSHIP_INRIA.git INRIA_2026
cd INRIA_2026
```

> **Note si vous avez déjà cloné sans l'option** :
> ```bash
> git submodule update --init --recursive
> ```

---

### 2. Services Docker (PostgreSQL + Weaviate)

Le fichier `docker-compose.yml` à la racine lance les deux bases de données nécessaires :

```bash
# Démarrer PostgreSQL et Weaviate en arrière-plan
docker compose up -d
```

Vérifier que les services sont bien lancés :

```bash
docker compose ps
```

Vous devriez voir :

| Service      | Port(s)           | Status  |
|:-------------|:-------------------|:--------|
| `postgres`   | `5432:5432`        | Running |
| `weaviate`   | `8080:8080`, `50051:50051` | Running |

> **Identifiants PostgreSQL par défaut** (modifiables dans `docker-compose.yml`) :
> - User : `medsim`
> - Password : `medsim_password`
> - Database : `medsim`

---

### 3. Backend Python

#### a) Créer et activer l'environnement virtuel

```bash
# Depuis la racine du projet
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
```

#### b) Installer les dépendances

```bash
pip install -r requirements.txt
```

> **Note** : L'installation de `torch` et `transformers` peut prendre plusieurs minutes (~2-5 Go de téléchargement).

#### c) Compiler le moteur Datalog (`maelys-datalog`)

Le moteur de règles de MedSim repose sur `maelys-datalog` (implémenté en C11). Il est nécessaire de compiler la bibliothèque C partagée et de générer l'extension CFFI Python :

```bash
# Compiler la bibliothèque C partagée
cmake -S maelys-datalog -B maelys-datalog/build/python-small -DMAELYS_DATALOG_BUILD_PYTHON_BINDING=ON
cmake --build maelys-datalog/build/python-small --target maelys_py_bind

# Compiler l'extension CFFI Python
python maelys-datalog/bindings/python/build_cffi.py
```

#### d) Configurer les variables d'environnement

Copier et adapter le fichier d'environnement :

```bash
cp Backend/.env.example Backend/.env
# Ou créer manuellement le fichier (voir section Configuration ci-dessous)
```

Si le fichier `.env.example` n'existe pas, créer `Backend/.env` avec le contenu suivant :

```env
# Clés API Gemini (obligatoire)
GEMINI_API_KEY=votre_clé_gemini_ici
GEMINI_API_KEY_QUESTION_ANALYSIS=votre_seconde_clé_gemini_ici

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=
WEAVIATE_COLLECTION=MedicalDocuments

# PostgreSQL
DATABASE_URL=postgresql+psycopg://medsim:medsim_password@localhost:5432/medsim

# JWT (changer en production)
JWT_SECRET_KEY=medsim-dev-secret-key-change-me
```

#### e) Initialiser la base de données PostgreSQL

```bash
cd Backend
python -m db.init_db
```

Vous devriez voir :
```
Database tables created successfully.
```

---

### 4. Frontend Next.js

#### a) Installer les dépendances Node.js

```bash
cd medsim-frontend
npm install
```

#### b) Configurer les variables d'environnement

Créer (ou vérifier) le fichier `medsim-frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Configuration

### Variables d'environnement Backend

| Variable | Description | Obligatoire | Valeur par défaut |
|:---------|:------------|:-----------:|:------------------|
| `GEMINI_API_KEY` | Clé API Google Gemini pour le LLM | ✅ | — |
| `GEMINI_API_KEY_QUESTION_ANALYSIS` | Clé Gemini dédiée à l'analyse des questions | ✅ | — |
| `WEAVIATE_URL` | URL du serveur Weaviate | ❌ | `http://localhost:8080` |
| `WEAVIATE_API_KEY` | Clé API Weaviate (vide = accès anonyme local) | ❌ | `""` |
| `WEAVIATE_COLLECTION` | Nom de la collection Weaviate | ❌ | `MedicalDocuments` |
| `DATABASE_URL` | URL de connexion PostgreSQL | ✅ | — |
| `JWT_SECRET_KEY` | Clé secrète pour la signature des tokens JWT | ✅ | — |
| `EXCERPT_COUNT` | Nombre de chunks récupérés par requête RAG | ❌ | `50` |
| `MAX_RETRIES` | Nombre de tentatives en cas d'échec LLM | ❌ | `3` |

> **Obtenir une clé Gemini** : Rendez-vous sur [Google AI Studio](https://aistudio.google.com/apikey) pour générer une clé API gratuite.

### Variables d'environnement Frontend

| Variable | Description | Valeur par défaut |
|:---------|:------------|:------------------|
| `NEXT_PUBLIC_API_URL` | URL de l'API Backend | `http://localhost:8000/api` |

---

## Lancer le projet

### Option A : Démarrage complet (3 terminaux)

**Terminal 1 — Bases de données :**
```bash
# Depuis la racine du projet
docker compose up -d
```

**Terminal 2 — Backend :**
```bash
# Depuis la racine du projet
source venv/bin/activate
cd Backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

> Au premier lancement, le backend télécharge automatiquement les modèles d'embedding (~400 Mo). Attendez le message :
> ```
> Preloading ML embedding and reranker models at startup...
> Models successfully loaded and ready.
> ```

**Terminal 3 — Frontend :**
```bash
cd medsim-frontend
npm run dev
```

### Accès aux services

| Service       | URL                          |
|:--------------|:-----------------------------|
| **Frontend**  | http://localhost:3000         |
| **API Backend** | http://localhost:8000       |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Weaviate REST** | http://localhost:8080     |

---

## Première utilisation

Une fois le projet démarré (Docker + Backend + Frontend) et les données ingérées :

1. **Créer un compte** — Ouvrir http://localhost:3000, cliquer sur « Inscription ». Choisir le rôle **STUDENT** (ou **PROFESSOR** pour accéder à la gestion des patients et des documents).

2. **Se connecter** — Entrer l'email et le mot de passe créés.

3. **Choisir le mode** - CHoisir entre Pédagogique et Notation.

3. **Sélectionner un patient** — Sur la page de chat, parcourir la liste des cas cliniques. Cliquer sur un patient pour démarrer la consultation.

4. **Mener l'anamnèse** — Poser des questions au patient virtuel via le chat. Le chronomètre de 10 minutes démarre dès la première question. Le système RAG récupère les informations pertinentes du dossier et les filtre via le moteur Datalog.

5. **Soumettre le diagnostic** — Cliquer sur le bouton diagnostic, saisir le diagnostic principal et jusqu'à 3 diagnostics différentiels.

6. **Rédiger la prescription** — Ajouter les molécules (nom, posologie, voie d'administration, durée).

7. **Consulter le rapport** — Le système retourne un rapport de notation sur 5 indicateurs (couverture, pertinence, structure, diagnostic, prescription) avec une note lettrée (A–F).

> **Astuce** : Activer le **mode pédagogique** pour recevoir un feedback après chaque question (pertinence, mini-cours théorique basé sur les documents scientifiques).

## Ingestion des données

Avant de pouvoir utiliser le simulateur, il faut ingérer les documents (patients + articles scientifiques) dans la base vectorielle Weaviate.

### Ingestion automatique

```bash
# Depuis la racine du projet, avec le venv activé
cd Backend
python ingest.py
```

Ce script :
1. **Parcourt** `Document_patient/patient_*.json` — découpe chaque dossier patient en chunks et les vectorise
2. **Parcourt** `Document_scientifique/*.pdf` — extrait le texte des PDFs médicaux, les chunke (méthode parent-child) et les vectorise
3. **Stocke** l'ensemble dans Weaviate avec les embeddings `BAAI/bge-base-en-v1.5`

> **Durée** : L'ingestion complète (~5 patients + 9 PDFs) prend quelque minutes selon votre machine.

### Documents fournis

| Dossier | Contenu | Quantité |
|:--------|:--------|:---------|
| `Document_patient/` | Dossiers patients structurés en JSON | 5 patients |
| `Document_scientifique/` | Articles et référentiels médicaux (PDF) | 9 documents |

---

## Utilisation

### Rôles utilisateur

| Rôle | Permissions |
|:-----|:-----------|
| **STUDENT** | Consulter les patients, mener des simulations, créer des patients temporaires (48h) |
| **PROFESSOR** | Toutes les permissions étudiant + créer/supprimer des patients permanents, gérer les documents scientifiques |

### Endpoints API principaux

| Méthode | Endpoint | Description |
|:--------|:---------|:------------|
| `POST` | `/api/ask` | Poser une question au patient |
| `POST` | `/api/diagnose` | Soumettre un diagnostic |
| `POST` | `/api/prescribe` | Soumettre une prescription |
| `POST` | `/api/clear` | Réinitialiser une session |
| `GET` | `/api/patients` | Lister les patients |
| `GET` | `/api/patients/grouped` | Patients groupés par spécialité |
| `POST` | `/api/patients` | Créer un patient |
| `DELETE` | `/api/patients/{id}` | Supprimer un patient |
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |

> **Documentation interactive** : Swagger UI disponible à http://localhost:8000/docs

---

## Structure du projet

```
INRIA_2026/
├── Backend/                        # API et logique métier
│   ├── api/
│   │   ├── main.py                 # Point d'entrée FastAPI, CORS, startup/shutdown
│   │   ├── schemas.py              # Modèles Pydantic (requêtes/réponses)
│   │   ├── services.py             # Orchestration du pipeline /ask
│   │   ├── dependencies.py         # Injection de dépendances (clés API, modèles ML)
│   │   ├── auth/                   # Authentification JWT
│   │   │   ├── router.py           # Routes /auth/register, /auth/login, /auth/me
│   │   │   ├── dependencies.py     # Guards d'authentification (get_current_user)
│   │   │   ├── schemas.py          # Schémas Pydantic auth
│   │   │   └── utils.py            # Hachage bcrypt, création/décodage JWT
│   │   └── routers/
│   │       ├── chat.py             # /ask, /diagnose, /prescribe, /clear
│   │       ├── patients.py         # CRUD patients (création, suppression, listing)
│   │       ├── documents.py        # Gestion documents scientifiques (upload, ingestion)
│   │       └── images.py           # Gestion images médicales (upload, serving)
│   ├── core/
│   │   ├── config.py               # Configuration globale, modèles ML, Weaviate, scoring
│   │   ├── config_topics.py        # Registre centralisé des topics / target_slots
│   │   ├── clinical/
│   │   │   └── vignette.py         # Génération de vignettes cliniques humanisées
│   │   ├── evaluation/
│   │   │   ├── diagnostic.py       # Évaluation du diagnostic étudiant
│   │   │   ├── prescription.py     # Évaluation de la prescription (LLM)
│   │   │   └── scoring.py          # Calcul du rapport de notation (5 indicateurs)
│   │   ├── llms/
│   │   │   └── llm_gem.py          # Intégration Google Gemini (génération, analyse, éval.)
│   │   ├── rag/
│   │   │   ├── chunking.py         # 5 méthodes de chunking (semantic, fixed, sentence, structure, parent-child)
│   │   │   ├── embedding.py        # Vectorisation et stockage Weaviate
│   │   │   ├── retrieval.py        # Recherche vectorielle + BM25 + fusion hybride RRF
│   │   │   └── reranking.py        # Re-ranking MedCPT, expansion parent-child, build context
│   │   ├── state/
│   │   │   ├── datalog_engine.py   # Singleton moteur Datalog (maelys-datalog)
│   │   │   ├── state_motor.py      # Filtrage des faits (3 variantes : simple, advanced, datalog)
│   │   │   └── verification.py     # Vérification post-génération, synonymes médicaux
│   │   └── utils/
│   │       ├── cache.py            # Cache de session en mémoire (historique, état clinique)
│   │       ├── helpers.py          # Chargement des données patient
│   │       └── text_processing.py  # Nettoyage PDF, découpage en phrases
│   ├── db/
│   │   ├── models.py               # Modèles SQLAlchemy (User, Patient, PatientImage, ScientificDocument)
│   │   ├── session.py              # Configuration session DB (SQLAlchemy engine)
│   │   ├── init_db.py              # Script d'initialisation des tables
│   │   └── enums.py                # Énumérations (UserRole : STUDENT, PROFESSOR)
│   ├── data/                       # Données annexes (legacy)
│   ├── ingest.py                   # Script d'ingestion des documents dans Weaviate
│   └── .env                        # Variables d'environnement (non versionné)
│
├── medsim-frontend/                # Interface utilisateur Next.js
│   ├── app/
│   │   ├── layout.tsx              # Layout racine (providers, fonts, metadata)
│   │   ├── page.tsx                # Page d'accueil + sélection patient
│   │   ├── globals.css             # Styles globaux + thème
│   │   └── patients/nouveau/       # Page de création de patient
│   ├── components/
│   │   ├── auth-screen.tsx         # Écran de connexion / inscription
│   │   ├── auth-dialog.tsx         # Modal d'authentification
│   │   ├── clinical-sidebar.tsx    # Sidebar vignette clinique (faits révélés)
│   │   ├── diagnosis-modal.tsx     # Modal de diagnostic + différentiels
│   │   ├── navbar.tsx              # Barre de navigation + sélection patient
│   │   ├── mode-selection.tsx      # Sélection mode standard / pédagogique
│   │   ├── palette-selector.tsx    # Sélecteur de palette de couleurs
│   │   ├── upload-document-dialog.tsx   # Upload de documents scientifiques
│   │   ├── delete-document-dialog.tsx   # Suppression de documents
│   │   ├── delete-patient-dialog.tsx    # Suppression de patients
│   │   ├── chat/                   # Composants du chat (messages, input, pipeline view)
│   │   ├── patient-form/           # Formulaire multi-étapes création patient
│   │   ├── pipeline/               # Visualisation du pipeline RAG (debug)
│   │   └── ui/                     # Composants UI réutilisables (shadcn/ui)
│   ├── context/
│   │   └── auth-context.tsx        # Contexte React d'authentification
│   ├── hooks/
│   │   ├── use-medsim.ts           # Hook principal (état consultation, appels API)
│   │   ├── use-auth.ts             # Hook d'authentification
│   │   └── use-interval.ts         # Hook chronomètre
│   ├── lib/
│   │   └── api.ts                  # Client API (fetch wrapper, gestion tokens)
│   ├── types/
│   │   └── api.ts                  # Types TypeScript (interfaces API)
│   └── .env.local                  # Variables d'environnement frontend
│
├── maelys-datalog/                 # Moteur Datalog embarqué (sous-module)
├── Document_patient/               # 100 dossiers patients structurés (JSON)
├── Document_scientifique/          # 9 articles et référentiels médicaux (PDF)
├── Benchmark/                      # Scripts et résultats de benchmark RAG
│   ├── benchmark_chunking.py       # Benchmark des 5 stratégies de chunking
│   ├── benchmark_embedding.py      # Benchmark des modèles d'embedding (MTEB)
│   ├── benchmark_rerankers.py      # Benchmark des rerankers
│   ├── compare_result.py           # Comparaison croisée des résultats
│   ├── results_Chunking/           # Résultats chunking
│   ├── results_NFCorpus/           # Résultats sur NFCorpus
│   ├── results_SciFact/            # Résultats sur SciFact
│   └── results_MedicalQARetrieval/ # Résultats sur MedicalQARetrieval
│
├── docs/                           # Documentation technique détaillée
├── docker-compose.yml              # PostgreSQL 16 + Weaviate 1.30
├── requirements.txt                # Dépendances Python
└── .gitignore
```

---

## Stack technique

### Backend
| Composant | Technologie |
|:----------|:------------|
| Framework API | FastAPI 0.139 |
| LLM | Google Gemini (`gemini-flash-lite-latest`) |
| Embeddings | `BAAI/bge-base-en-v1.5` (768 dim) |
| Cross-Encoder | `ncbi/MedCPT-Cross-Encoder` |
| Base vectorielle | Weaviate 1.30 |
| Base relationnelle | PostgreSQL 16 + SQLAlchemy 2.0 |
| ORM | SQLAlchemy avec Mapped types |
| Auth | JWT (PyJWT + bcrypt) |
| ML Runtime | PyTorch 2.12, Transformers 5.12, Sentence-Transformers 5.6 |
| PDF Parsing | PyMuPDF |

### Frontend
| Composant | Technologie |
|:----------|:------------|
| Framework | Next.js 16.3 (App Router) |
| Langage | TypeScript |
| UI Components | shadcn/ui + Radix |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Theme | next-themes (dark/light mode) |

---

## Documentation technique

La documentation technique détaillée est disponible dans le dossier [`docs/`](docs/) :

| Document | Contenu |
|:---------|:--------|
| [`00-vue-ensemble.md`](docs/00-vue-ensemble.md) | Contexte, objectifs, vocabulaire, limites et évolutions |
| [`01-architecture.md`](docs/01-architecture.md) | Composants, diagrammes, base de données, déploiement |
| [`02-pipeline-rag.md`](docs/02-pipeline-rag.md) | Flux complet d'une requête, chunking, embedding, reranking |
| [`03-moteur-datalog.md`](docs/03-moteur-datalog.md) | Moteur de règles Datalog, contrôle d'accès, sécurité |
| [`04-evaluation-et-scoring.md`](docs/04-evaluation-et-scoring.md) | Système de notation, 5 indicateurs, mode pédagogique |
| [`05-ingestion-et-benchmarks.md`](docs/05-ingestion-et-benchmarks.md) | Scripts d'ingestion, résultats de benchmark, justifications |

---

## Dépannage

| Symptôme | Cause possible | Diagnostic | Solution |
|:---------|:---------------|:-----------|:---------|
| `connection refused` sur port 5432 | Conteneur PostgreSQL arrêté | `docker compose ps` | `docker compose up -d` |
| `connection refused` sur port 8080 | Conteneur Weaviate arrêté | `docker compose ps` | `docker compose up -d` |
| `GEMINI_API_KEY` non définie | Fichier `.env` absent ou incomplet | Vérifier `Backend/.env` | Créer le fichier avec les clés (voir section Configuration) |
| Réponse LLM impossible / erreur 500 | Clé API absente, invalide ou quota dépassé | Logs backend (`uvicorn`) | Vérifier la clé sur [Google AI Studio](https://aistudio.google.com/apikey) |
| Recherche vide (aucun résultat RAG) | Collection Weaviate absente ou vide | `curl http://localhost:8080/v1/schema` | Relancer l'ingestion : `cd Backend && python ingest.py` |
| Backend lent au premier démarrage | Téléchargement des modèles ML (~400 Mo) | Logs : `Preloading ML...` | Attendre le message `Models successfully loaded and ready.` |
| `ModuleNotFoundError` | Environnement virtuel non activé | `which python` | `source venv/bin/activate` |
| Port 3000 déjà utilisé | Autre processus sur ce port | `lsof -i :3000` | `npx kill-port 3000` ou `kill <PID>` |
| Port 8000 déjà utilisé | Autre processus sur ce port | `lsof -i :8000` | `kill <PID>` |
| Erreur `psycopg` | Driver PostgreSQL manquant | Traceback Python | `pip install psycopg[binary]` |
| `JWT token expired` | Token expiré (durée : 24h) | Erreur 401 dans le frontend | Se reconnecter via l'interface |
| Erreur de type `weaviate.exceptions` | Version Weaviate incompatible | `docker compose logs weaviate` | Vérifier que l'image est `cr.weaviate.io/semitechnologies/weaviate:1.30.0` |

---
