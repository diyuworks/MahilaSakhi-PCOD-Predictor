#!/usr/bin/env python3
"""
CLI utility for human verification of clinical evidence chunks in backend/knowledge/chunks.json.
Prints each chunk next to its source URL and locator so a human clinician can inspect,
validate verbatim accuracy, and toggle verified to true.
"""
import json
import os
import sys

CHUNKS_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "knowledge", "chunks.json")


def verify_chunks_report():
    if not os.path.exists(CHUNKS_PATH):
        print(f"Error: Chunks file not found at {CHUNKS_PATH}")
        sys.exit(1)

    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print("=" * 80)
    print(" MAHILASAKHI CLINICAL KNOWLEDGE CHUNKS VERIFICATION REPORT")
    print(f" Source file: {os.path.abspath(CHUNKS_PATH)}")
    print(f" Total chunks found: {len(chunks)}")
    print("=" * 80)

    verified_count = 0
    unverified_count = 0

    for i, c in enumerate(chunks, 1):
        is_verified = c.get("verified", False)
        if is_verified:
            verified_count += 1
            status_badge = "[VERIFIED / APPROVED]"
        else:
            unverified_count += 1
            status_badge = "[UNVERIFIED - REQUIRES CLINICIAN REVIEW]"

        print(f"\n[{i}/{len(chunks)}] Chunk ID: {c.get('id')}  {status_badge}")
        print(f"  • Domain Tags : {', '.join(c.get('tags', []))}")
        print(f"  • Source      : {c.get('source')}")
        print(f"  • Locator     : {c.get('locator')}")
        print(f"  • Source URL  : {c.get('url', 'N/A')}")
        print("  • Verbatim Text Excerpt:")
        # Wrap text nicely
        text = c.get("text", "").strip()
        lines = [text[j:j + 74] for j in range(0, len(text), 74)]
        for line in lines:
            print(f"    | {line}")

    print("\n" + "=" * 80)
    print(f"SUMMARY: Verified: {verified_count} | Pending Human/Clinician Review: {unverified_count}")
    print("NOTICE : Only an authorized human clinician may flip 'verified' to true in chunks.json.")
    print("=" * 80)


if __name__ == "__main__":
    verify_chunks_report()
