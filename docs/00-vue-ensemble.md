# Vue d'ensemble

## Contexte du projet

MedSim est un simulateur de consultation médicale développé dans le cadre d'un stage à l'IRISA Rennes. Il permet aux étudiants en médecine de s'entraîner à mener une consultation complète (anamnèse, diagnostic, prescription) avec un patient virtuel piloté par un pipeline RAG (Retrieval-Augmented Generation).

Le système repose sur deux sources de données :
- Des **dossiers patients structurés** (JSON) contenant les informations médicales avec des politiques de révélation contrôlées
- Des **documents scientifiques** (PDF) — référentiels, recommandations, cours — indexés dans une base vectorielle

L'originalité de MedSim réside dans la combinaison d'un pipeline RAG avec un **moteur de règles Datalog** ([maelys-datalog](https://github.com/maelys-dev/maelys-datalog)) qui contrôle de manière formelle quelles informations peuvent être révélées à l'étudiant en fonction de l'avancée de la consultation.

---

## Objectifs fonctionnels

| Objectif | Description |
|:---------|:------------|
| Simulation réaliste | L'étudiant interagit avec un patient virtuel via un chat, le LLM incarnant le patient avec une personnalité configurable (anxiété, précision, coopérativité) |
| Anamnèse structurée | Le système trace les thèmes abordés (topics) et contrôle la révélation des informations médicales via le moteur Datalog |
| Évaluation multi-critères | Notation sur 5 indicateurs pondérés : couverture, pertinence, structure, diagnostic, prescription |
| Mode pédagogique | Feedback en temps réel après chaque question + mini-cours théorique basé sur les documents scientifiques |
| Gestion multi-utilisateurs | Authentification JWT, rôles (STUDENT, PROFESSOR), patients permanents et temporaires |

## Objectifs techniques

| Objectif | Implémentation |
|:---------|:---------------|
| Recherche hybride dense + sparse | Fusion RRF stratifiée (`retrieval.py`) : vectorielle (near_vector) + BM25 avec pondération par type de source |
| Contrôle d'accès formel | Moteur Datalog (`datalog_engine.py`) avec 7 prédicats EDB et 5 règles statiques |
| Vérification post-génération | Boucle retry (`verification.py`) : le LLM ne peut pas révéler des faits non autorisés par le moteur |
| Chunking optimisé | 5 méthodes benchmarkées, parent-child retenu pour les PDFs |
| Évaluation de prescription par LLM | Structured output LLM pour scorer molécules, posologie, voie, durée, contre-indications |

---

## Fonctionnalités implémentées

### Cœur du simulateur
- Chat avec patient virtuel (personnalité configurable via `patient_attitude`)
- Analyse sémantique des questions étudiantes (extraction des `target_slots`)
- Recherche hybride dans la base vectorielle (dense + BM25 + fusion RRF)
- Reranking avec cross-encoder MedCPT
- Filtrage des informations par le moteur Datalog (contrôle d'accès)
- Vérification post-génération (fact_ids autorisés, pas de nouvelles affirmations)
- Vignette clinique dynamique (reconstruction par section des faits révélés)

### Évaluation
- Diagnostic avec vérification par synonymes médicaux
- Diagnostics différentiels (bonus si pertinents)
- Prescription évaluée par LLM (molécules, posologie, voie, durée, CI)
- Rapport de notation final sur 5 indicateurs + note lettrée (A–F)
- Chronomètre de consultation (10 minutes)

### Mode pédagogique
- Évaluation de la pertinence de chaque question
- Feedback pédagogique après chaque échange
- Synthèse théorique basée sur les documents scientifiques (RAG sur les PDFs)

### Gestion
- Authentification JWT (inscription, connexion, tokens 24h)
- Rôles STUDENT et PROFESSOR
- Upload et ingestion de documents scientifiques (PDF)
- Upload d'images médicales associées aux faits patients

---

## Fonctionnalités non implémentées

| Fonctionnalité | Raison |
|:---------------|:-------|
| Examen physique interactif | Nécessiterait une interface spécifique (sélection de zones corporelles, résultats d'examen contextuels) |
| Multi-langue | Le système est en français uniquement. Les modèles d'embedding sont en anglais (BGE-base-en) mais les dossiers patients sont en français, ce qui fonctionne grâce au cross-encoder MedCPT au reranking |
| Persistance des sessions | Les sessions de consultation sont en mémoire (`cache.py` — dict Python). Un redémarrage du backend perd les sessions en cours |
| Tests unitaires backend | Pas de suite de tests automatisés pour le backend MedSim.
| CI/CD et déploiement production | Le projet fonctionne uniquement en développement local avec Docker Compose |
| Historique des consultations | Les résultats des consultations ne sont pas persistés en base — le rapport est affiché puis perdu |
|CRUD patients |(permanents pour PROFESSOR, temporaires 48h pour STUDENT)|

---

## Glossaire

| Terme | Définition |
|:------|:-----------|
| **Patient** | Cas clinique structuré en JSON avec identité, antécédents, symptômes, constantes, etc. Chaque information porte un `fact_id` et une `reveal_policy` |
| **Session** | Instance de consultation en cours. Maintenue en mémoire (`cache.py`) avec l'historique des messages, les topics explorés, les faits révélés, le chronomètre |
| **Topic / Target slot** | Thème clinique abordé par l'étudiant (ex. : `history_explored`, `allergies_asked`, `pain_type_asked`). Définis dans `config_topics.py` |
| **Chunk** | Fragment de texte indexé dans Weaviate avec son embedding. Pour les patients : un fait médical enrichi de contexte. Pour les PDFs : un morceau de page découpé (parent-child) |
| **Embedding** | Vecteur de dimension 768 produit par `BAAI/bge-base-en-v1.5`. Représentation numérique du contenu sémantique d'un chunk |
| **Reranking** | Réordonnancement des résultats de recherche par un cross-encoder (`ncbi/MedCPT-Cross-Encoder`) qui évalue la pertinence question-chunk |
| **Reveal policy** | Politique de révélation d'un fait médical : `direct_if_asked` (toujours), `direct_if_<topic>` (si le topic est exploré), `only_if_<topic>` (si exploré ET question en cours) |
| **Fact ID** | Identifiant unique d'un fait médical dans un dossier patient (ex. : `history_1`, `vitals_3`). Utilisé pour le contrôle d'accès et la traçabilité |
| **State motor** | Module de filtrage des informations RAG. Utilise le moteur Datalog pour décider quels faits peuvent être transmis au LLM |
| **EDB** | Extensional Database — les faits de base fournis au moteur Datalog (topics explorés, policies des faits, slot courant) |
| **IDB** | Intensional Database — les faits dérivés par les règles Datalog (`allow`, `blocked`) |
| **Vignette clinique** | Résumé structuré par section de toutes les informations déjà révélées au cours de la consultation. Affiché dans la sidebar du frontend |
| **Mode pédagogique** | Mode optionnel où l'étudiant reçoit un feedback après chaque question (pertinence, mini-cours théorique) |

---

## Limites connues

### Limites techniques
- **Sessions en mémoire** : le cache Python (`dict`) ne survit pas à un redémarrage du backend. En production, il faudrait utiliser Redis ou persister en base
- **Pas de tests automatisés** : la validation se fait manuellement (scénarios fonctionnels)
- **Modèles d'embedding en anglais** : `bge-base-en-v1.5` est entraîné en anglais. Les dossiers patients en français fonctionnent grâce au reranking MedCPT, mais un modèle multilingue pourrait améliorer la recherche
- **Synonymes médicaux codés en dur** : le dictionnaire dans `verification.py` est limité. Un matching LLM ou une base terminologique (UMLS) serait plus robuste
- **Single process** : l'architecture mono-process ne supporte pas la montée en charge (pas de worker pool, pas de load balancing)

### Limites fonctionnelles
- **Pas d'examen physique** : la consultation est limitée à l'anamnèse (questions/réponses textuelles)
- **Évaluation de prescription par LLM** : dépend de la qualité du modèle Gemini, pas de vérification contre une base médicamenteuse officielle
- **Patient virtuel non adversarial** : le patient coopère toujours (même si la personnalité module le style). Pas de simulation de patient difficile qui refuse de répondre ou ment

---

**Fichiers de référence** : [`config.py`](../Backend/core/config.py) · [`config_topics.py`](../Backend/core/config_topics.py) · [`cache.py`](../Backend/core/utils/cache.py)

→ Suite : [01-architecture.md](01-architecture.md)
