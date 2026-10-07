"""
Pack MahilaSakhi repository into a clean distribution zip.
Excludes secrets, build artifacts, virtualenvs, and git directories.
"""

import os
import sys
import zipfile
from pathlib import Path

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
}

EXCLUDED_PATH_PREFIXES = {
    os.path.normpath("frontend/build"),
    os.path.normpath("frontend/node_modules"),
}


def is_env_file(filename: str) -> bool:
    """Return True if file is an .env file, False if it is .env.example or non-env."""
    name = filename.lower()
    if name.endswith(".env.example"):
        return False
    if name == ".env" or name.endswith(".env") or ".env." in name:
        return True
    return False


def pack_repo(repo_root: Path = None, output_zip: Path = None) -> Path:
    if repo_root is None:
        repo_root = Path(__file__).resolve().parent.parent
    else:
        repo_root = Path(repo_root).resolve()

    if output_zip is None:
        dist_dir = repo_root / "dist"
        dist_dir.mkdir(parents=True, exist_ok=True)
        output_zip = dist_dir / "MahilaSakhi_clean.zip"
    else:
        output_zip = Path(output_zip).resolve()
        output_zip.parent.mkdir(parents=True, exist_ok=True)

    excluded_top_level = set()
    files_to_pack = []

    for root, dirs, files in os.walk(repo_root):
        rel_root = os.path.relpath(root, repo_root)

        # Filter dirs in-place to prevent recursing into excluded directories
        dirs_to_remove = []
        for d in list(dirs):
            rel_dir_path = os.path.normpath(os.path.join(rel_root, d)) if rel_root != "." else d
            first_part = rel_dir_path.split(os.sep)[0]

            if d in EXCLUDED_DIRS or rel_dir_path in EXCLUDED_PATH_PREFIXES:
                dirs_to_remove.append(d)
                excluded_top_level.add(rel_dir_path)

        for d in dirs_to_remove:
            dirs.remove(d)

        for f in files:
            rel_file_path = os.path.normpath(os.path.join(rel_root, f)) if rel_root != "." else f

            # Check env file exclusion
            if is_env_file(f):
                excluded_top_level.add(rel_file_path)
                continue

            # Check cache / temporary files
            if f.endswith((".pyc", ".pyo", ".pyd")):
                continue

            full_path = Path(root) / f
            # Skip output zip if within repo
            if output_zip.exists() and full_path.resolve() == output_zip.resolve():
                continue

            files_to_pack.append((full_path, rel_file_path))

    print("Excluded top-level paths / patterns:")
    for p in sorted(excluded_top_level):
        print(f"  - {p}")

    # Create zip file
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for full_path, arcname in files_to_pack:
            # Normalize to forward slashes inside zip archive
            archive_name = arcname.replace("\\", "/")
            zf.write(full_path, archive_name)

    # Verification: FAIL if any file named .env ended up in the zip
    has_leak = False
    leaked_name = ""
    with zipfile.ZipFile(output_zip, "r") as zf:
        names = zf.namelist()
        for name in names:
            basename = os.path.basename(name)
            if basename == ".env" or (is_env_file(basename) and not basename.endswith(".env.example")):
                has_leak = True
                leaked_name = name
                break

    if has_leak:
        output_zip.unlink(missing_ok=True)
        raise RuntimeError(f"SECURITY CHECK FAILED: Found excluded env file in zip: {leaked_name}")

    print(f"\nSuccessfully created clean archive: {output_zip} ({len(files_to_pack)} files)")
    return output_zip


if __name__ == "__main__":
    pack_repo()
