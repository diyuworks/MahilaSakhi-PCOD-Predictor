"""Crisis + out-of-scope detection for ALL chat input (typed or voice transcripts).
English, romanised Hinglish and Devanagari Hindi. Errs on the side of showing support (false positives are acceptable).
TODO(native speaker + clinician): review phrase lists and response wording."""
import re
import unicodedata

CRISIS = [
    r"kill myself", r"end my life", r"want to die", r"wanna die", r"don'?t want to (live|be alive)",
    r"suicid", r"hurt myself", r"self[- ]?harm", r"no reason to live", r"better off dead",
    r"jeene ka (mann|man|mood) nahi", r"jeena nahi chah", r"marna chah", r"mar jana chah", r"mar jaun",
    r"khud ko (khatam|nuksan|hurt)", r"zindagi khatam", r"aatmahatya", r"suicide karn",
    "मरना चाह", "मर जाना चाह", "जीने का मन नहीं", "जीना नहीं चाह", "आत्महत्या", "खुद को खत्म", "खुद को नुकसान",
]
DOSE = [
    r"(?:\d|\b)mg\b", r"\bdose\b", r"\bdosage\b", r"\bprescri\w*",
    r"kitni (goli|tablet|dawai|dawa)", r"kitna (lena|khana)",
    r"how (much|many).*(take|tablet|pill)", "कितनी (गोली|दवा|टैबलेट)", "खुराक", "कितना लेना"
]
DIAGNOSE = [
    r"do i have (pcos|pcod)", r"am i (suffering|diagnosed)", r"kya mujhe (pcos|pcod)", r"mujhe (pcos|pcod) hai (kya|na)",
    "क्या मुझे (पीसीओएस|पीसीओडी)", r"\bdiagnos\w*"
]

_C = [re.compile(p, re.I) for p in CRISIS]
_D = [re.compile(p, re.I) for p in DOSE]
_G = [re.compile(p, re.I) for p in DIAGNOSE]


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", t or "")).strip().lower()


def _is_hindi(t: str) -> bool:
    return bool(re.search(r"[\u0900-\u097F]", t or ""))


MSG = {
    "crisis": {
        "en": "I'm really sorry you're feeling this way. You deserve support right now. Please talk to someone you trust, "
              "or call Tele-MANAS at 14416 (free, 24x7, many languages). If you might act on these thoughts, call 112 or go to the "
              "nearest hospital. I'm here, but a real person can help you more.",
        "hi": "आप जो महसूस कर रही हैं, उसके लिए मुझे बहुत खेद है। अभी आपको सहारे की ज़रूरत है। कृपया किसी भरोसेमंद व्यक्ति से बात करें, "
              "या Tele-MANAS 14416 पर कॉल करें (मुफ़्त, 24x7)। अगर आप खुद को नुकसान पहुँचा सकती हैं तो 112 पर कॉल करें या नज़दीकी अस्पताल जाएँ।",
    },
    "dose": {
        "en": "I can't advise on medicines or doses. A doctor or pharmacist who knows your history should guide that. "
              "I can help you prepare questions to ask them.",
        "hi": "मैं दवाओं या खुराक के बारे में सलाह नहीं दे सकती। यह आपके डॉक्टर या फ़ार्मासिस्ट को तय करना चाहिए। "
              "मैं उनसे पूछने के सवाल तैयार करने में मदद कर सकती हूँ।",
    },
    "diagnose": {
        "en": "I can't diagnose PCOS. Only a clinician can, using your history, exam and tests. I can show which areas matter most for "
              "you and what to discuss with a doctor.",
        "hi": "मैं PCOS का निदान नहीं कर सकती। यह डॉक्टर आपके इतिहास, जाँच और टेस्ट के आधार पर करते हैं। "
              "मैं बता सकती हूँ कि आपके लिए कौन से क्षेत्र ज़रूरी हैं और डॉक्टर से क्या पूछें।",
    },
}


def check_message(text: str):
    """Returns None if the message may go to the grounded LLM, else {'kind','reply','urgent'} to return immediately."""
    t = _norm(text)
    lang = "hi" if _is_hindi(text) else "en"
    for kind, pats in (("crisis", _C), ("dose", _D), ("diagnose", _G)):
        if any(p.search(t) for p in pats):
            return {"kind": kind, "reply": MSG[kind][lang], "urgent": kind == "crisis"}
    return None
