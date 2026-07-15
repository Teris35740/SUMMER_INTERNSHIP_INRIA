from sentence_transformers import CrossEncoder
import torch
import gc
import time

if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"
else:
    device = "cpu"

print(f"Exécution sur : {device}\n")

cross_encoders = {
    "MedCPT-Cross-Encoder": "ncbi/MedCPT-Cross-Encoder",
    "BiomedBERT-Reranker": "NeuML/biomedbert-base-reranker",
    "BGE-Reranker-Base": "BAAI/bge-reranker-base"
}

query = "How does vitamin D supplementation affect bone density in elderly patients?"

candidates = [
    "Vitamin C is essential for immune system function and preventing scurvy.", # Hors sujet
    "Calcium supplements can cause gastrointestinal distress in some elderly patients.", # Proche, mais pas ça
    "Recent clinical trials show that daily Vitamin D3 supplementation significantly reduces the rate of bone fractures and improves bone mineral density in postmenopausal women and elderly men.", # LA BONNE RÉPONSE
    "Bone density scans (DEXA) are recommended every two years for patients over 65.", # Contexte médical, mais pas la réponse
    "Sun exposure is a natural way to synthesize vitamin D, though sunscreen blocks this process." # Contexte, mais pas clinique
]

pairs = [[query, doc] for doc in candidates]

def clear_memory():
    gc.collect()
    if device == "mps":
        torch.mps.empty_cache()

for name, model_id in cross_encoders.items():
    print(f"{'='*50}")
    print(f"Chargement de {name}...")
    
    try:
        model = CrossEncoder(model_id, device=device)
        
        _ = model.predict(pairs)
        
        start_time = time.time()
        scores = model.predict(pairs)
        execution_time = (time.time() - start_time) * 1000 # En millisecondes
        
        print(f"Temps de réponse pour 5 documents : {execution_time:.2f} ms")
        print("\nClassement (Scores bruts) :")
        
        results = [{"score": score, "text": text} for score, text in zip(scores, candidates)]
        results.sort(key=lambda x: x["score"], reverse=True)
        
        for i, res in enumerate(results):
            snippet = res["text"][:70] + "..."
            print(f"#{i+1} | Score: {res['score']:>7.3f} | {snippet}")
            
    except Exception as e:
        print(f"Erreur avec {name} : {e}")
        
    finally:
        del model
        clear_memory()
        print(f"{'='*50}\n")