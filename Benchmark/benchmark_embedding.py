import mteb
from mteb.cache import ResultCache
from sentence_transformers import SentenceTransformer
import torch
import gc
import time 

if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"
else:
    device = "cpu"

print(f"Exécution sur : {device}")

class MedCPTWrapper(SentenceTransformer):
    def __init__(self, query_model_id, article_model_id, device):
        super().__init__(query_model_id, device=device)
        self.article_encoder = SentenceTransformer(article_model_id, device=device)

    def encode_queries(self, queries, batch_size=32, **kwargs):
        return super().encode(queries, batch_size=batch_size, **kwargs)

    def encode_corpus(self, corpus, batch_size=32, **kwargs):
        if isinstance(corpus[0], dict):
            texts = [f"{doc.get('title', '')} {doc.get('text', '')}".strip() for doc in corpus]
        else:
            texts = corpus
        return self.article_encoder.encode(texts, batch_size=batch_size, **kwargs)

def clear_memory():
    gc.collect()
    if device == "mps":
        torch.mps.empty_cache()
    elif device == "cuda":
        torch.cuda.empty_cache()

model_configs = [
    {"name": "BGE-Base", "type": "standard", "id": "BAAI/bge-base-en-v1.5"},
    {"name": "PubMedBert", "type": "standard", "id": "pritamdeka/S-PubMedBert-MS-MARCO"},
    {"name": "MedCPT", "type": "dual", "query_id": "ncbi/MedCPT-Query-Encoder", "article_id": "ncbi/MedCPT-Article-Encoder"},
    {"name": "BioLORD-2023", "type": "standard", "id": "FremyCompany/BioLORD-2023-M"},
    {"name": "BioBERT", "type": "standard", "id": "dmis-lab/biobert-v1.1"}
]

medical_tasks = ["MedicalQARetrieval"]
tasks = mteb.get_tasks(tasks=medical_tasks)

for config in model_configs:
    model_name = config["name"]
    print(f"\n--- Chargement de {model_name} ---")
    
    if config["type"] == "standard":
        model_instance = SentenceTransformer(config["id"], device=device)
    elif config["type"] == "dual":
        model_instance = MedCPTWrapper(config["query_id"], config["article_id"], device)
    
    cache = ResultCache(f"results/{model_name}")
    
    print(f"Début de l'évaluation sur MedicalQARetrieval...")
    start_time = time.time() # Lancement du chrono
    
    mteb.evaluate(
        model=model_instance,
        tasks=tasks,
        cache=cache,
        encode_kwargs={"batch_size": 32} 
    )
    
    end_time = time.time() # Arrêt du chrono
    execution_time = end_time - start_time
    
    # Affichage du temps d'exécution en minutes et secondes
    mins, secs = divmod(execution_time, 60)
    print(f"--- Fin de {model_name} en {int(mins)}m {int(secs)}s ---")
    
    del model_instance 
    clear_memory()