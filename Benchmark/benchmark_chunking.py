from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Any

import torch
from sentence_transformers import CrossEncoder, SentenceTransformer, util

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
	sys.path.insert(0, str(REPO_ROOT))

from Backend.core.chunking import (
	build_chunk_records_from_json,
	build_chunk_records_from_pdf,
	document_structure,
	fixed_size_chunking,
	parent_child_chunking,
	semantic_chunking,
	sentence_aware_chunking,
)
from Backend.core.embedding import embedding_db
from Backend.core.config import MODEL_NAME_CROSS_ENCODER, MODEL_NAME_QUERY, _tokenizer
from Backend.core.llm import answer_with_gemini
from Backend.core.reranking import re_ranking
from Backend.core.retrieval import embed_question


CHUNKING_METHODS = ("semantic", "fixed", "sentence", "structure", "parent_child")
DEFAULT_SOURCE_ROOT = REPO_ROOT / "Benchmark" / "DataSet"
DEFAULT_FALLBACK_ROOT = REPO_ROOT / "Document_patient"
DEFAULT_QUESTIONS_FILE = REPO_ROOT / "Benchmark" / "Question" / "chunking.json"
ANNOTATION_FILENAMES = ("benchmark_cases.jsonl", "benchmark_cases.json")
EXCLUDED_SOURCE_NAMES = set(ANNOTATION_FILENAMES) | {
	"benchmark_report.json",
	"benchmark_results.json",
	"benchmark_summary.json",
}


@dataclass
class BenchmarkCase:
	case_id: str
	question: str
	answer: str | None = None
	target_documents: list[str] = field(default_factory=list)
	source_file: str | None = None
	source_type: str | None = None
	patient_id: str | None = None
	relevant_fact_ids: list[str] = field(default_factory=list)
	relevant_chunk_refs: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class CaseResult:
	case_id: str
	question: str
	answer: str | None
	source_file: str | None
	source_type: str | None
	method: str
	hit_rate: float
	mrr: float
	avg_rerank_score: float
	context_precision: float
	context_recall: float
	top_rank_fact_ids: list[str]
	top_rank_chunks: list[str]


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="Benchmark chunking strategies on the RAG pipeline.")
	parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
	parser.add_argument("--fallback-root", type=Path, default=DEFAULT_FALLBACK_ROOT)
	parser.add_argument("--questions-file", type=Path, default=DEFAULT_QUESTIONS_FILE)
	parser.add_argument("--output-dir", type=Path, default=REPO_ROOT / "Benchmark" / "results" / "chunking")
	parser.add_argument("--methods", type=str, default=",".join(CHUNKING_METHODS))
	parser.add_argument("--top-k", type=int, default=int(os.getenv("EXCERPT_COUNT", "5")))
	parser.add_argument("--candidate-pool-size", type=int, default=20)
	parser.add_argument("--alpha", type=float, default=0.5)
	parser.add_argument("--max-tokens", type=int, default=250)
	parser.add_argument("--chunk-size", type=int, default=250)
	parser.add_argument("--overlap", type=int, default=50)
	parser.add_argument("--similarity-threshold", type=float, default=0.65)
	parser.add_argument("--show-context", action="store_true")
	parser.add_argument("--generate-answer", action="store_true")
	return parser.parse_args()


def normalize_text(text: str) -> list[str]:
	text = unicodedata.normalize("NFKD", text.lower())
	text = "".join(char for char in text if not unicodedata.combining(char))
	return re.findall(r"[a-z0-9]+", text)


def extract_fact_ids(text: str) -> list[str]:
	fact_ids = re.findall(r"\[([A-Za-z][A-Za-z0-9_-]*)\]", text)
	return sorted({fact_id for fact_id in fact_ids if fact_id and fact_id[0] in {"h", "t", "v"}})


def to_cpu_tensor(value: Any) -> torch.Tensor:
	if isinstance(value, torch.Tensor):
		return value.detach().cpu().float()
	return torch.tensor(value, dtype=torch.float32)


def discover_source_documents(source_root: Path, fallback_root: Path) -> tuple[Path, list[Path]]:
	def collect(root: Path) -> list[Path]:
		if not root.exists():
			return []
		files: list[Path] = []
		for path in root.rglob("*"):
			if not path.is_file():
				continue
			if path.name in EXCLUDED_SOURCE_NAMES:
				continue
			if path.suffix.lower() not in {".json", ".pdf"}:
				continue
			files.append(path)
		return sorted(files)

	source_files = collect(source_root)
	if source_files:
		return source_root, source_files

	fallback_files = collect(fallback_root)
	if fallback_files:
		return fallback_root, fallback_files

	return source_root, []


def load_annotation_cases(path: Path) -> list[BenchmarkCase]:
	if not path.exists():
		return []

	if path.suffix == ".jsonl":
		cases: list[BenchmarkCase] = []
		with open(path, "r", encoding="utf-8") as handle:
			for line_number, line in enumerate(handle, start=1):
				line = line.strip()
				if not line:
					continue
				payload = json.loads(line)
				cases.append(normalize_case_payload(payload, prefix=f"{path.stem}:{line_number}"))
		return cases

	with open(path, "r", encoding="utf-8") as handle:
		payload = json.load(handle)
	if isinstance(payload, dict):
		payload = payload.get("cases", [])
	return [normalize_case_payload(item, prefix=f"{path.stem}:{index}") for index, item in enumerate(payload, start=1)]


def normalize_case_payload(payload: dict[str, Any], prefix: str) -> BenchmarkCase:
	relevant_fact_ids = payload.get("relevant_fact_ids") or payload.get("expected_fact_ids") or []
	relevant_chunk_refs = payload.get("relevant_chunk_refs") or payload.get("expected_chunk_refs") or []
	target_documents = payload.get("target_documents") or []

	if isinstance(relevant_fact_ids, str):
		relevant_fact_ids = [relevant_fact_ids]
	if isinstance(target_documents, str):
		target_documents = [target_documents]

	case_id = payload.get("case_id") or payload.get("id") or prefix
	question = payload.get("question") or payload.get("query") or ""
	answer = payload.get("answer") or payload.get("expected_answer")

	return BenchmarkCase(
		case_id=case_id,
		question=question,
		answer=answer,
		target_documents=list(target_documents),
		source_file=payload.get("source_file") or payload.get("document"),
		source_type=payload.get("source_type"),
		patient_id=payload.get("patient_id"),
		relevant_fact_ids=list(relevant_fact_ids),
		relevant_chunk_refs=list(relevant_chunk_refs),
	)


def load_patient_document(path: Path) -> dict[str, Any]:
	with open(path, "r", encoding="utf-8") as handle:
		return json.load(handle)


def build_patient_narrative(doc: dict[str, Any]) -> str:
	lines = [
		f"patient_id: {doc.get('patient_id', 'unknown')}",
		f"identity: age={doc.get('identity', {}).get('age', 'unknown')} sex={doc.get('identity', {}).get('sex', 'unknown')}",
		f"chief_complaint: {doc.get('chief_complaint', 'unknown')}",
	]

	for section in ("history", "treatments", "vitals"):
		facts = doc.get(section) or []
		if not facts:
			continue
		lines.append(f"{section}:")
		for fact in facts:
			fact_id = fact.get("fact_id", "unknown")
			text = fact.get("text", "").strip()
			lines.append(f"[{fact_id}] {text}")

	return "\n".join(lines)


def template_question_for_fact(section: str, fact: dict[str, Any], doc: dict[str, Any]) -> str:
	text = fact.get("text", "").lower()
	complaint = doc.get("chief_complaint", "le patient")

	if section == "history":
		if "irradie" in text:
			return "Où irradie la douleur ?"
		if "episode similaire" in text or "épisode similaire" in text:
			return "A-t-il deja eu un episode similaire auparavant ?"
		if "asthmatique" in text:
			return "Le patient a-t-il un antecedent d'asthme ?"
		if "allerg" in text:
			return "Le patient a-t-il une exposition allergique importante ?"
		return f"Quelle information clinique importante est rapportee sur {complaint} ?"

	if section == "treatments":
		return "Quel traitement prend le patient ?"

	if section == "vitals":
		if "fievre" in text or "temp" in text:
			return "Le patient a-t-il de la fievre ?"
		return "Quels sont les signes vitaux du patient ?"

	return f"Quelle est l'information associee a {fact.get('fact_id', 'ce fait')} ?"


def auto_generate_cases_from_patient_json(path: Path) -> list[BenchmarkCase]:
	doc = load_patient_document(path)
	generated: list[BenchmarkCase] = []

	for section in ("history", "treatments", "vitals"):
		for fact in doc.get(section, []) or []:
			fact_id = fact.get("fact_id")
			if not fact_id:
				continue
			generated.append(
				BenchmarkCase(
					case_id=f"{doc.get('patient_id', path.stem)}::{fact_id}",
					question=template_question_for_fact(section, fact, doc),
					answer=fact.get("text", "").strip(),
					source_file=path.name,
					source_type="patient",
					patient_id=doc.get("patient_id"),
					relevant_fact_ids=[fact_id],
				)
			)

	return generated


def build_json_chunk_records(path: Path, method: str, max_tokens: int, overlap: int, similarity_threshold: float) -> list[dict[str, Any]]:
	chunk_records = build_chunk_records_from_json(path)
	
	records: list[dict[str, Any]] = []
	for record in chunk_records:
		enriched = dict(record)
		fact_ids = [record["fact_id"]] if "fact_id" in record else []
		enriched.update(
			{
				"method": method,
				"effective_content": record.get("content", ""),
				"fact_ids": fact_ids,
			}
		)
		records.append(enriched)
	return records

	records = []
	for index, chunk in enumerate(chunks, start=1):
		records.append(
			{
				"content": chunk,
				"effective_content": chunk,
				"source_type": "patient",
				"source_file": path.name,
				"patient_id": doc.get("patient_id"),
				"method": method,
				"chunk_index": index,
				"fact_ids": extract_fact_ids(chunk),
			}
		)
	return records


def build_pdf_chunk_records(path: Path, method: str, max_tokens: int, overlap: int, similarity_threshold: float) -> list[dict[str, Any]]:
	if method == "semantic":
		chunk_records = build_chunk_records_from_pdf(
			path,
			method=method,
			max_tokens=max_tokens,
			similarity_threshold=similarity_threshold,
		)
	elif method == "fixed":
		chunk_records = build_chunk_records_from_pdf(path, method=method, max_tokens=max_tokens, similarity_threshold=similarity_threshold)
	elif method == "sentence":
		chunk_records = build_chunk_records_from_pdf(path, method=method, max_tokens=max_tokens, similarity_threshold=similarity_threshold)
	elif method == "structure":
		chunk_records = build_chunk_records_from_pdf(path, method=method, max_tokens=max_tokens, similarity_threshold=similarity_threshold)
	elif method == "parent_child":
		chunk_records = build_chunk_records_from_pdf(path, method=method, max_tokens=max_tokens, similarity_threshold=similarity_threshold)
	else:
		raise ValueError(f"Unknown chunking method: {method}")

	enriched_records: list[dict[str, Any]] = []
	for index, record in enumerate(chunk_records, start=1):
		content = record.get("content", "")
		enriched = dict(record)
		enriched.update(
			{
				"method": method,
				"chunk_index": index,
				"effective_content": enriched.get("parent_content") or content,
				"fact_ids": extract_fact_ids(content),
			}
		)
		enriched_records.append(enriched)
	return enriched_records


def build_chunk_records_for_source(path: Path, method: str, max_tokens: int, overlap: int, similarity_threshold: float) -> list[dict[str, Any]]:
	if path.suffix.lower() == ".json":
		return build_json_chunk_records(path, method, max_tokens, overlap, similarity_threshold)
	if path.suffix.lower() == ".pdf":
		return build_pdf_chunk_records(path, method, max_tokens, overlap, similarity_threshold)
	return []


def build_cases_for_source(path: Path) -> list[BenchmarkCase]:
	if path.suffix.lower() == ".json":
		return auto_generate_cases_from_patient_json(path)
	return []


def resolve_case_source_files(case: BenchmarkCase, source_files: list[Path]) -> list[Path]:
	if case.target_documents:
		target_names = {Path(target).name for target in case.target_documents}
		matched_files = [source_file for source_file in source_files if source_file.name in target_names]
		if matched_files:
			return matched_files
		return []
	return source_files


def keyword_similarity(question: str, content: str) -> float:
	question_terms = set(normalize_text(question))
	if not question_terms:
		return 0.0
	content_terms = set(normalize_text(content))
	return len(question_terms & content_terms) / len(question_terms)


def rank_candidates_local(question: str, chunk_records: list[dict[str, Any]], query_model: SentenceTransformer, alpha: float) -> list[dict[str, Any]]:
	if not chunk_records:
		return []

	query_embedding = to_cpu_tensor(embed_question(question, query_model))
	chunk_embeddings = to_cpu_tensor(embedding_db([row["content"] for row in chunk_records], model=query_model))

	if chunk_embeddings.ndim == 1:
		chunk_embeddings = chunk_embeddings.unsqueeze(0)

	vector_scores = util.cos_sim(query_embedding, chunk_embeddings)[0].cpu().tolist()

	ranked_rows: list[dict[str, Any]] = []
	for row, vector_score in zip(chunk_records, vector_scores):
		enriched = dict(row)
		kw_score = keyword_similarity(question, row.get("content", ""))
		enriched["dense_score"] = vector_score
		enriched["keyword_score"] = kw_score
		enriched["hybrid_score"] = alpha * vector_score + (1.0 - alpha) * kw_score
		ranked_rows.append(enriched)

	ranked_rows.sort(key=lambda item: item["hybrid_score"], reverse=True)
	return ranked_rows


def is_relevant_row(row: dict[str, Any], case: BenchmarkCase) -> bool:
	row_fact_ids = set(row.get("fact_ids") or extract_fact_ids(row.get("content", "")))
	if case.relevant_fact_ids and row_fact_ids:
		if row_fact_ids & set(case.relevant_fact_ids):
			return True

	for ref in case.relevant_chunk_refs:
		if not isinstance(ref, dict):
			continue
		if case.source_file and ref.get("source_file") and ref.get("source_file") != case.source_file:
			continue
		page_number = ref.get("page_number")
		if page_number is not None and row.get("page_number") != page_number:
			continue
		chunk_index = ref.get("chunk_index")
		if chunk_index is not None and row.get("chunk_index") != chunk_index:
			continue
		return True

	if case.answer:
		answer_tokens = set(normalize_text(case.answer))
		row_tokens = set(normalize_text(row.get("effective_content") or row.get("content", "")))
		return bool(answer_tokens & row_tokens)

	return False


def compute_context_scores(case: BenchmarkCase, rows: list[dict[str, Any]]) -> tuple[float, float]:
	if not rows:
		return 0.0, 0.0

	if case.answer:
		answer_tokens = set(normalize_text(case.answer))
		if not answer_tokens:
			return 0.0, 0.0

		context_text = " ".join(row.get("effective_content") or row.get("content", "") for row in rows)
		context_tokens = set(normalize_text(context_text))
		overlap = answer_tokens & context_tokens
		precision = len(overlap) / max(len(context_tokens), 1)
		recall = len(overlap) / max(len(answer_tokens), 1)
		return precision, recall

	if case.relevant_fact_ids:
		relevant_hits = sum(1 for row in rows if is_relevant_row(row, case))
		precision = relevant_hits / max(len(rows), 1)
		recall = relevant_hits / max(len(case.relevant_fact_ids), 1)
		return precision, recall

	return 0.0, 0.0


def benchmark_case(
	case: BenchmarkCase,
	method: str,
	chunk_records: list[dict[str, Any]],
	query_model: SentenceTransformer,
	cross_encoder: CrossEncoder,
	top_k: int,
	candidate_pool_size: int,
	alpha: float,
) -> CaseResult:
	ranked_rows = rank_candidates_local(case.question, chunk_records, query_model, alpha=alpha)
	candidate_rows = ranked_rows[:candidate_pool_size]
	reranked_rows = re_ranking(candidate_rows, case.question, cross_encoder)
	top_rows = reranked_rows[:top_k]

	first_relevant_rank = 0
	for index, row in enumerate(top_rows, start=1):
		if is_relevant_row(row, case):
			first_relevant_rank = index
			break

	hit_rate = 1.0 if first_relevant_rank else 0.0
	mrr = 1.0 / first_relevant_rank if first_relevant_rank else 0.0
	avg_rerank_score = mean([float(row.get("rerank_score", 0.0)) for row in top_rows]) if top_rows else 0.0
	context_precision, context_recall = compute_context_scores(case, top_rows)

	top_rank_fact_ids: list[str] = []
	top_rank_chunks: list[str] = []
	for row in top_rows:
		top_rank_fact_ids.extend(row.get("fact_ids") or extract_fact_ids(row.get("content", "")))
		top_rank_chunks.append(row.get("effective_content") or row.get("content", ""))

	return CaseResult(
		case_id=case.case_id,
		question=case.question,
		answer=case.answer,
		source_file=case.source_file,
		source_type=case.source_type,
		method=method,
		hit_rate=hit_rate,
		mrr=mrr,
		avg_rerank_score=avg_rerank_score,
		context_precision=context_precision,
		context_recall=context_recall,
		top_rank_fact_ids=sorted(set(top_rank_fact_ids)),
		top_rank_chunks=top_rank_chunks,
	)


def summarize_results(results: list[CaseResult]) -> list[dict[str, Any]]:
	grouped: dict[str, list[CaseResult]] = defaultdict(list)
	for result in results:
		grouped[result.method].append(result)

	summary_rows: list[dict[str, Any]] = []
	for method, method_results in grouped.items():
		summary_rows.append(
			{
				"method": method,
				"cases": len(method_results),
				"hit_rate": mean(result.hit_rate for result in method_results),
				"mrr": mean(result.mrr for result in method_results),
				"avg_rerank_score": mean(result.avg_rerank_score for result in method_results),
				"context_precision": mean(result.context_precision for result in method_results),
				"context_recall": mean(result.context_recall for result in method_results),
			}
		)

	summary_rows.sort(key=lambda row: (row["mrr"], row["hit_rate"], row["context_recall"]), reverse=True)
	return summary_rows


def print_summary(summary_rows: list[dict[str, Any]]) -> None:
	header = (
		f"{'Method':<15} | {'Cases':<5} | {'Hit@K':<7} | {'MRR':<7} | {'Avg rerank':<12} | "
		f"{'Ctx Prec.':<10} | {'Ctx Recall':<11}"
	)
	print("=" * len(header))
	print(header)
	print("-" * len(header))
	for row in summary_rows:
		print(
			f"{row['method']:<15} | {row['cases']:<5d} | {row['hit_rate']:<7.4f} | {row['mrr']:<7.4f} | "
			f"{row['avg_rerank_score']:<12.4f} | {row['context_precision']:<10.4f} | {row['context_recall']:<11.4f}"
		)
	print("=" * len(header))


def main() -> int:
	args = parse_args()
	methods = [method.strip() for method in args.methods.split(",") if method.strip()]
	invalid_methods = sorted(set(methods) - set(CHUNKING_METHODS))
	if invalid_methods:
		raise SystemExit(f"Unknown methods: {', '.join(invalid_methods)}")

	source_root, source_files = discover_source_documents(args.source_root, args.fallback_root)
	annotation_cases = load_annotation_cases(args.questions_file)

	if not source_files:
		print(f"No source documents found in {args.source_root}")
		if source_root != args.fallback_root:
			print(f"No dataset in {args.source_root}. Fallback root used: {source_root}")
		return 0

	if source_root != args.source_root:
		print(f"Dataset root is empty, using fallback data from: {source_root}")
	else:
		print(f"Using dataset root: {source_root}")

	if annotation_cases:
		print(f"Using questions file: {args.questions_file}")
	else:
		print(f"No questions found in: {args.questions_file}")

	query_model = SentenceTransformer(MODEL_NAME_QUERY)
	cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)

	output_dir: Path = args.output_dir
	output_dir.mkdir(parents=True, exist_ok=True)

	all_results: list[CaseResult] = []

	for method in methods:
		print(f"\n--- Method: {method} ---")
		for case in annotation_cases or []:
			case_source_files = resolve_case_source_files(case, source_files)
			if not case_source_files:
				continue

			chunk_records: list[dict[str, Any]] = []
			for source_file in case_source_files:
				chunk_records.extend(
					build_chunk_records_for_source(
						source_file,
						method=method,
						max_tokens=args.max_tokens,
						overlap=args.overlap,
						similarity_threshold=args.similarity_threshold,
					)
				)

			if not chunk_records:
				continue

			result = benchmark_case(
				case=case,
				method=method,
				chunk_records=chunk_records,
				query_model=query_model,
				cross_encoder=cross_encoder,
				top_k=args.top_k,
				candidate_pool_size=args.candidate_pool_size,
				alpha=args.alpha,
			)
			all_results.append(result)

			if args.show_context:
				print(f"\nCase: {case.case_id}")
				print(f"Question: {case.question}")
				print(f"Targets: {', '.join(case.target_documents) if case.target_documents else 'all documents'}")
				for rank, chunk in enumerate(result.top_rank_chunks, start=1):
					print(f"  [{rank}] {chunk}")

		if not annotation_cases:
			for source_file in source_files:
				if source_file.suffix.lower() == ".json":
					source_cases = build_cases_for_source(source_file)
				else:
					source_cases = []

				if not source_cases:
					continue

				chunk_records = build_chunk_records_for_source(
					source_file,
					method=method,
					max_tokens=args.max_tokens,
					overlap=args.overlap,
					similarity_threshold=args.similarity_threshold,
				)

				if not chunk_records:
					continue

				for case in source_cases:
					result = benchmark_case(
						case=case,
						method=method,
						chunk_records=chunk_records,
						query_model=query_model,
						cross_encoder=cross_encoder,
						top_k=args.top_k,
						candidate_pool_size=args.candidate_pool_size,
						alpha=args.alpha,
					)
					all_results.append(result)

	summary_rows = summarize_results(all_results)
	print_summary(summary_rows)

	report = {
		"timestamp": datetime.utcnow().isoformat(timespec="seconds") + "Z",
		"source_root": str(source_root),
		"dataset_root": str(args.source_root),
		"fallback_root": str(args.fallback_root),
		"questions_file": str(args.questions_file),
		"methods": methods,
		"top_k": args.top_k,
		"candidate_pool_size": args.candidate_pool_size,
		"alpha": args.alpha,
		"max_tokens": args.max_tokens,
		"chunk_size": args.chunk_size,
		"overlap": args.overlap,
		"similarity_threshold": args.similarity_threshold,
		"summary": summary_rows,
		"cases": [result.__dict__ for result in all_results],
	}

	report_path = output_dir / f"chunking_benchmark_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
	with open(report_path, "w", encoding="utf-8") as handle:
		json.dump(report, handle, ensure_ascii=False, indent=2)

	print(f"\nReport written to: {report_path}")

	if args.generate_answer and all_results:
		best_method = summary_rows[0]["method"] if summary_rows else methods[0]
		best_case = next((case for case in all_results if case.method == best_method), None)
		if best_case is not None:
			context = "\n\n---\n\n".join(best_case.top_rank_chunks)
			api_key = os.getenv("GEMINI_API_KEY")
			if api_key:
				print("\n--- Gemini answer for the best ranked case ---")
				print(answer_with_gemini(best_case.question, context, api_key))

	return 0


if __name__ == "__main__":
	raise SystemExit(main())