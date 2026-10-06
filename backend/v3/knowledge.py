"""Tiny TF-IDF retriever over HUMAN-VERIFIED guideline chunks only."""
import json, os
from typing import Any, Dict, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge", "chunks.json")


def load_chunks(only_verified: bool = True) -> List[Dict[str, Any]]:
    with open(PATH, encoding="utf-8") as f:
        chunks = json.load(f)
    return [c for c in chunks if c.get("verified")] if only_verified else chunks


def retrieve(query: str, tags: List[str], k: int = 3, chunks=None) -> List[Dict[str, Any]]:
    chunks = chunks if chunks is not None else load_chunks()
    pool = [c for c in chunks if set(c["tags"]) & set(tags)]
    if not pool:
        return []
    vec = TfidfVectorizer(stop_words="english").fit([c["text"] for c in pool] + [query])
    sims = cosine_similarity(vec.transform([query]), vec.transform([c["text"] for c in pool]))[0]
    order = sims.argsort()[::-1][:k]
    return [pool[i] for i in order]
