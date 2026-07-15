import json
from pathlib import Path

results_dir = Path("results_MedicalQARetrieval")
benchmark_data = []

print("Analyse des fichiers de résultats...\n")

for json_file in results_dir.rglob("*.json"):
    with open(json_file, 'r') as f:
        try:
            data = json.load(f)
            
            model_name = json_file.relative_to(results_dir).parts[0]
            
            scores = data.get("scores", {})
            test_scores = scores.get("test", [])
            
            if isinstance(test_scores, list) and len(test_scores) > 0:
                s = test_scores[0]
            elif isinstance(test_scores, dict):
                s = test_scores
            else:
                continue 
            
            def get_metric(metric_name):
                val = s.get(f"{metric_name}_at_10") or s.get(f"{metric_name}@10")
                return round(val, 4) if val is not None else 0.0000

            ndcg_10 = get_metric("ndcg")
            map_10 = get_metric("map")
            mrr_10 = get_metric("mrr")
            recall_10 = get_metric("recall")
            
            if ndcg_10 > 0:
                benchmark_data.append({
                    "Modèle": model_name,
                    "NDCG@10": ndcg_10,
                    "MAP@10": map_10,
                    "MRR@10": mrr_10,
                    "Recall@10": recall_10
                })
                
        except json.JSONDecodeError:
            print(f"Erreur de lecture sur le fichier {json_file}")

benchmark_data.sort(key=lambda x: x["NDCG@10"], reverse=True)

header = f"{'Modèle':<25} | {'NDCG@10':<10} | {'MAP@10':<10} | {'MRR@10':<10} | {'Recall@10':<10}"
print("=" * len(header))
print(header)
print("-" * len(header))

for row in benchmark_data:
    print(f"{row['Modèle']:<25} | {row['NDCG@10']:<10.4f} | {row['MAP@10']:<10.4f} | {row['MRR@10']:<10.4f} | {row['Recall@10']:<10.4f}")

print("=" * len(header) + "\n")