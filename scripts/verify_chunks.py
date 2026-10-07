#!/usr/bin/env python3
"""
CLI utility for human verification of clinical evidence chunks in backend/knowledge/chunks.json.
Prints each chunk next to its source URL and locator so a human clinician can inspect,
validate accuracy against primary guidelines, and toggle verified to true.

Usage:
  python scripts/verify_chunks.py                  # Display human review report
  python scripts/verify_chunks.py --set-verified <ID> # Toggle verified: true for a single chunk after manual audit
"""
import argparse
import json
import os
import sys

CHUNKS_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "knowledge", "chunks.json")


def load_chunks():
    if not os.path.exists(CHUNKS_PATH):
        print(f"Error: Chunks file not found at {CHUNKS_PATH}")
        sys.exit(1)
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_chunks(chunks):
    with open(CHUNKS_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)


def set_chunk_verified(chunk_id: str):
    chunks = load_chunks()
    found = False
    for c in chunks:
        if c.get("id") == chunk_id:
            c["verified"] = True
            c["review_status"] = "VERIFIED: checked and confirmed against primary clinical source"
            found = True
            break

    if not found:
        print(f"Error: Chunk ID '{chunk_id}' not found in {CHUNKS_PATH}")
        sys.exit(1)

    save_chunks(chunks)
    print(f"Success: Marked chunk '{chunk_id}' as verified=True in {CHUNKS_PATH}")


def verify_chunks_report():
    chunks = load_chunks()

    print("=" * 80)
    print(" MAHILASAKHI CLINICAL KNOWLEDGE CHUNKS VERIFICATION REPORT")
    print(f" Source file: {os.path.abspath(CHUNKS_PATH)}")
    print(f" Total chunks found: {len(chunks)}")
    print("=" * 80)

    verified_count = 0
    unverified_count = 0

    for i, c in enumerate(chunks, 1):
        is_verified = c.get("verified", False)
        review_status = c.get("review_status", "UNVERIFIED")
        if is_verified:
            verified_count += 1
            status_badge = "[VERIFIED / APPROVED]"
        else:
            unverified_count += 1
            status_badge = "[UNVERIFIED - REQUIRES CLINICIAN REVIEW]"

        print(f"\n[{i}/{len(chunks)}] Chunk ID: {c.get('id')}  {status_badge}")
        print(f"  • Review Status: {review_status}")
        print(f"  • Domain Tags  : {', '.join(c.get('tags', []))}")
        print(f"  • Source       : {c.get('source')}")
        print(f"  • Locator      : {c.get('locator')}")
        print(f"  • Source URL   : {c.get('url', 'N/A')}")
        print("  • Verbatim / Paraphrased Text Excerpt:")
        text = c.get("text", "").strip()
        lines = [text[j:j + 74] for j in range(0, len(text), 74)]
        for line in lines:
            print(f"    | {line}")

    print("\n" + "=" * 80)
    print(f"SUMMARY: Verified: {verified_count} | Pending Human/Clinician Review: {unverified_count}")
    print("NOTICE : Only an authorized human clinician may flip 'verified' to true in chunks.json.")
    print("HELPER : Use 'python scripts/verify_chunks.py --set-verified <ID>' to verify individual chunks.")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="Verify clinical chunks in MahilaSakhi")
    parser.add_argument(
        "--set-verified",
        metavar="ID",
        help="Mark a specific chunk ID as verified=True after manual clinician confirmation",
    )
    args = parser.parse_args()

    if args.set_verified:
        set_chunk_verified(args.set_verified)
    else:
        verify_chunks_report()


if __name__ == "__main__":
    main()
