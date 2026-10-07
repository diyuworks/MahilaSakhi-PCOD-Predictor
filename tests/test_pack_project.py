"""
Tests for scripts/pack_project.py.
Verifies exclusion of secrets (.env, *.env), build artifacts, and caches,
while ensuring .env.example is preserved and violations trigger failures.
"""

import sys
import zipfile
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from scripts.pack_project import pack_repo, is_env_file


def test_is_env_file():
    assert is_env_file(".env") is True
    assert is_env_file(".env.local") is True
    assert is_env_file("backend.env") is True
    assert is_env_file(".env.production") is True
    assert is_env_file(".env.example") is False
    assert is_env_file("backend.env.example") is False
    assert is_env_file("main.py") is False


def test_pack_project_mock_directory(tmp_path):
    # Setup mock repo structure
    mock_repo = tmp_path / "mock_repo"
    mock_repo.mkdir()

    (mock_repo / "backend").mkdir()
    (mock_repo / "backend" / "app.py").write_text("print('hello')")
    (mock_repo / "backend" / ".env").write_text("SECRET=123")
    (mock_repo / "backend" / ".env.example").write_text("SECRET=")
    (mock_repo / ".env").write_text("API_KEY=xyz")
    (mock_repo / "custom.env").write_text("TOKEN=abc")

    (mock_repo / "node_modules").mkdir()
    (mock_repo / "node_modules" / "pkg.js").write_text("// dummy")

    (mock_repo / "frontend").mkdir()
    (mock_repo / "frontend" / "build").mkdir()
    (mock_repo / "frontend" / "build" / "bundle.js").write_text("// bundle")
    (mock_repo / "frontend" / "src").mkdir()
    (mock_repo / "frontend" / "src" / "App.js").write_text("// app")

    (mock_repo / "__pycache__").mkdir()
    (mock_repo / "__pycache__" / "test.cpython-311.pyc").write_text("cache")

    out_zip = tmp_path / "test_clean.zip"
    pack_repo(repo_root=mock_repo, output_zip=out_zip)

    assert out_zip.exists()

    with zipfile.ZipFile(out_zip, "r") as zf:
        names = zf.namelist()
        # Verify valid code files are present
        assert "backend/app.py" in names
        assert "frontend/src/App.js" in names
        # Verify .env.example is preserved
        assert "backend/.env.example" in names

        # Verify excluded items are completely absent
        for name in names:
            assert ".env" not in name or name.endswith(".env.example"), f"Unexpected .env in archive: {name}"
            assert "custom.env" not in name
            assert "node_modules" not in name
            assert "frontend/build" not in name
            assert "__pycache__" not in name


def test_pack_project_fails_if_env_in_zip(tmp_path, monkeypatch):
    mock_repo = tmp_path / "mock_repo"
    mock_repo.mkdir()
    (mock_repo / "valid.txt").write_text("ok")
    (mock_repo / ".env").write_text("LEAK=1")

    # Temporarily monkeypatch is_env_file to simulate a filter bypass
    import scripts.pack_project as pp
    monkeypatch.setattr(pp, "is_env_file", lambda f: False)

    out_zip = tmp_path / "leak.zip"
    with pytest.raises(RuntimeError, match="SECURITY CHECK FAILED"):
        pack_repo(repo_root=mock_repo, output_zip=out_zip)
