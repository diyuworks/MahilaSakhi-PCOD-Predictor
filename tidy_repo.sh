#!/usr/bin/env bash
# MahilaSakhi repo tidy-up. Run from the repo ROOT. Safe moves only: backend/, model/, dataset/, frontend/src stay put.
set -euo pipefail
mv_() { mkdir -p "$(dirname "$2")"; if git rev-parse --git-dir >/dev/null 2>&1 && git ls-files --error-unmatch "$1" >/dev/null 2>&1; then git mv "$1" "$2"; else mv "$1" "$2"; fi; }

mkdir -p docs/agent-prompts docs/archive scripts/legacy ml/legacy tests/fixtures

[ -f AGENT_PROMPT.md ]                   && mv_ AGENT_PROMPT.md docs/agent-prompts/01-main-agent-prompt.md
[ -f README_v3_starter.md ]              && mv_ README_v3_starter.md docs/archive/README_v3_starter.md
[ -f mahilasakhi_chat_update.ps1 ]       && mv_ mahilasakhi_chat_update.ps1 scripts/legacy/mahilasakhi_chat_update.ps1

# old notebook + training script -> ml/legacy (one level deeper, so fix relative paths)
if [ -d notebook ]; then
  for f in notebook/*; do mv_ "$f" "ml/legacy/$(basename "$f")"; done
  rmdir notebook 2>/dev/null || true
  sed -i 's#\.\./dataset/#../../dataset/#g; s#\.\./model/#../../model/#g' ml/legacy/train_model.py
  [ -f ml/legacy/pcod_prediction.ipynb ] && sed -i 's#\.\./dataset/#../../dataset/#g; s#\.\./model/#../../model/#g' ml/legacy/pcod_prediction.ipynb
fi

# sample request becomes a test fixture; update the two tests that read it
if [ -f sample_request.json ]; then
  mv_ sample_request.json tests/fixtures/sample_request.json
  sed -i 's#os.path.dirname(__file__), "\.\.", "sample_request.json"#os.path.dirname(__file__), "fixtures", "sample_request.json"#' tests/test_wp1_backend.py tests/test_pdf.py
fi

echo "Done. NOT touched on purpose: root requirements.txt / runtime.txt (check Render first, see notes)."
