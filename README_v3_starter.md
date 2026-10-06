# MahilaSakhi v3 starter pack

Drop `backend/v3/`, `backend/knowledge/`, `ml/`, `tests/` into your repo root (merge with existing `backend/`).
Give `AGENT_PROMPT.md` to the Antigravity agent as the task.

Run tests:  `pip install pytest flask scikit-learn pandas openpyxl && python -m pytest tests -q`
Run ablation: `python ml/ablation.py dataset/PCOS_data_without_infertility.xlsx`

Wire into app.py (3 lines):
```python
from v3 import api as v3api
v3api._llm_client = client          # existing NVIDIA/OpenAI client
app.register_blueprint(v3api.bp)
```
Try it: POST /v3/assess with `sample_request.json`.

IMPORTANT: clinical thresholds (config.py), pathways (pathways.py) and knowledge chunks need clinician/source verification before real users.
