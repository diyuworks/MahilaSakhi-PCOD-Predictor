"""Chat v2: safety -> intent router -> deterministic answers from the structured Care Map ->
grounded LLM only when verified evidence exists -> validated fallback.
The server RECOMPUTES the assessment from the profile; client-supplied 'context' strings are never trusted."""
import json
import os
import re
from typing import Any, Dict, List, Optional

from .api import assess_profile
from .config import CONCERN_TO_DOMAIN
from .explain import BANNED
from .knowledge import load_chunks, retrieve
from .pathways import PATHWAYS
from .safety import check_message

MAX_MSG, MAX_HISTORY, MAX_WORDS = 500, 6, 120

LABEL = {
    "androgen": ("Hormonal / androgen health", "हार्मोनल / एंड्रोजन स्वास्थ्य", "Hormonal / androgen health"),
    "menstrual": ("Menstrual health", "मासिक धर्म स्वास्थ्य", "Menstrual health"),
    "metabolic": ("Metabolic health", "मेटाबॉलिक स्वास्थ्य", "Metabolic health"),
    "fertility": ("Fertility", "प्रजनन क्षमता", "Fertility"),
    "mental": ("Mental wellbeing", "मानसिक स्वास्थ्य", "Mental wellbeing"),
    "sleep": ("Sleep", "नींद", "Sleep / Neend"),
    "menopause_bone_cv": ("Menopause, bone and heart health", "मेनोपॉज़, हड्डी और हृदय स्वास्थ्य", "Menopause, bone aur heart health"),
}

DOMAIN_WORDS = {
    "androgen": r"\b(facial\s*hair|hirsut\w*|acne|pimples?|hair\s*loss|hair\s*fall|baal|chahre\s*ke\s*baal)\b|बाल|मुंहासे|अवांछित\s*बाल",
    "menstrual": r"\b(periods?|cycles?|menstru\w*|mahina|mahine|menses|bleeding)\b|पीरियड|मासिक|माहवारी",
    "metabolic": r"\b(sugars?|diabet\w*|weights?|bmi|insulin|cholesterol|vajan|wazan|motapa)\b|वजन|शर्करा|डायबिटीज|मोटापा",
    "fertility": r"\b(fertil\w*|pregnan\w*|conceiv\w*|garbh\w*|baccha|bacha|baby|conception)\b|गर्भ|प्रजनन|गर्भावस्था",
    "mental": r"\b(moods?|stress\w*|anxi\w*|depress\w*|tension|tanaav|ghabrahat|chinta)\b|तनाव|चिंता|अवसाद|मूड",
    "sleep": r"\b(sleep\w*|neend|insomnia|sona)\b|नींद|अनिद्रा",
    "menopause_bone_cv": r"\b(menopaus\w*|hot\s*flash\w*|bones?|hearts?|dil|haddi)\b|मेनोपॉज|हड्डी|हृदय|हार्ट",
}

INTENTS = [
    ("greeting", r"^\s*(?:hi+|hello+|hey+|good\s+morning|good\s+evening|good\s+afternoon|namaste+|namaskar+|pranam+|kese\s+ho|kaise\s+ho|kya\s+haal\s+hai|hola)\b(?:\s+(?:sakhi|didi|there|ji|aap))?[\s!.?]*$|^\s*(?:नमस्ते|नमस्कार|प्रणाम|कैसी\s*हैं|कैसे\s*हो)(?:\s+(?:सखी|दीदी|जी|आप))?[\s!.?]*$"),
    ("red_flags", r"\b(?:red\s*flags?|urgent\w*|emergenc\w*|warning\s+signs?|danger\s+signs?|khatr\w+|khatre\s+ke\s+nishan)\b|\b(?:when|kab)\b.*(?:doctor|specialist|hospital|clinic)\b.*(?:see|go|visit|jana|dikhana|consult)\b|\b(?:when|kab)\b.*(?:see|go|visit|jana|dikhana|consult)\b.*(?:doctor|specialist|hospital|clinic)\b|कब.*(?:डॉक्टर|अस्पताल)|खतरे\s*के\s*(?:लक्षण|निशान)|आपातकाल|इमरजेंसी|इमर्जेंसी"),
    ("who_to_see", r"\b(?:which|what\s+kind\s+of|kaun|kaunsa|kaunsi|kisko|kis)\b.*(?:doctor|specialist|clinician|gynecologist|endocrinologist|dermatologist|expert)\b|\bwho\s+(?:should|to|can)\s+(?:i\s+)?(?:see|consult|visit)\b|\b(?:kaun|kisko|kis)\b.*(?:dikhana|dikhaye|dikhayein?|dikhau|jayein?|consult|milein?)\b|(?:कौन|किसे|किस)\s+.*(?:डॉक्टर|विशेषज्ञ|दिखाएं|परामर्श|दिखाना)"),
    ("tests", r"\b(?:tests?|labs?|blood\s+tests?|lab\s+tests?|reports?|blood\s+work|jaanch|janch|test\s+karw\w*)\b|जांच|टेस्ट|रिपोर्ट"),
    ("doctor_questions", r"\b(?:ask\s+.*(?:doctor|clinician|physician)|(?:doctor|clinician|physician)\s+.*(?:ask\w*|question\w*|sawal\w*|puch\w*|pooch\w*|baat\w*)|questions?\s+.*(?:for|to)\s+.*(?:doctor|clinician)|sawal\s+.*(?:doctor|clinician)|(?:doctor|clinician)\s+.*sawal|sawal\s+puchein?|(?:discuss\w*|talk\w*)\s+.*(?:with\s+)?(?:doctor|clinician))\b|डॉक्टर\s+.*(?:पूछ\w*|सवाल\w*|बात\w*)|(?:पूछना|सवाल|बातचीत)\s+.*डॉक्टर"),
    ("monitor", r"\b(?:monitor\w*|track\w*|keep\s+an\s+eye|kya\s+monitor|kya\s+track|nazar\s+rakh\w*|dhyan\s+rakh\w*|kya\s+dekh\w*|dhyan\s+de\w*)\b|नज़र\s*रखें|ट्रैक\s*करें|मॉनिटर|निगरानी|ध्यान\s*रखें"),
    ("why_priority", r"\b(?:why\s+.*priorit\w*|why\s+.*top|why\s+ranked|reason\s+.*priorit\w*|kyun\s+.*priorit\w*|top\s+priorit\w*|pehle\s+kyun|kyu\s+hai\s+priority|priority\s+kyun|priority\s+kyu|top\s+priority\s+kyun|top\s+priority\s+kyu|sabse\s+pehle\s+kyu\w*|pehle\s+kyu\w*)\b|^\s*(?:why\b|kyun\b|kyu\b|क्यों\s+)|\b(?:why|kyun|kyu)\b|प्राथमिकता\s*क्यों|टॉप\s*प्रायोरिटी|सबसे\s*पहले\s*क्यों|क्यों\s+है\s+यह\s+प्राथमिक|प्राथमिकता|प्राथमिक"),
    ("lifestyle", r"\b(?:lifestyle\w*|diets?|dietary|exercises?|habits?|nutrition\w*|workouts?|khana\s*peena|kasrat|khorak|rozana\s+routine|rozana\s+kasrat)\b|जीवनशैली|आहार|व्यायाम|खान[\s-]पान|दिनचर्या|डाइट|पोषण|कसरत"),
]

_I = [(n, re.compile(p, re.I)) for n, p in INTENTS]
_D = {k: re.compile(v, re.I) for k, v in DOMAIN_WORDS.items()}

T = {
    "greeting": (
        "Hi! You can ask me why an area is your priority, what to ask your doctor, which tests to discuss, or what to monitor.",
        "नमस्ते! आप पूछ सकती हैं कि कोई क्षेत्र प्राथमिकता क्यों है, डॉक्टर से क्या पूछें, कौन से टेस्ट पर बात करें, या क्या देखते रहें।",
        "Namaste! Aap mujhse pooch sakti hain ki koi area aapki priority kyun hai, doctor se kya sawal puchein, kaun se tests par baat karein, ya kya monitor karein.",
    ),
    "doctor_q": (
        "Questions to bring to your doctor about {d}:",
        "{d} के बारे में डॉक्टर से पूछने के सवाल:",
        "{d} ke baare mein doctor se poochne ke sawal:",
    ),
    "tests": (
        "Tests you can ask your doctor whether they are right for you ({d}):",
        "{d} के लिए इन जाँचों के बारे में डॉक्टर से पूछें कि ये आपके लिए सही हैं या नहीं:",
        "{d} ke liye in tests ke baare mein doctor se discuss karein:",
    ),
    "no_tests": (
        "For {d} there are no specific tests to raise; your doctor will decide.",
        "{d} के लिए कोई खास जाँच नहीं सुझाई गई; डॉक्टर तय करेंगे।",
        "{d} ke liye koi specific tests nahi hain; aapke doctor decide karenge.",
    ),
    "who": (
        "For {d}, these professionals may be relevant: {x}.",
        "{d} के लिए ये विशेषज्ञ उपयोगी हो सकते हैं: {x}।",
        "{d} ke liye ye specialists helpful ho sakte hain: {x}।",
    ),
    "monitor": (
        "What to keep an eye on for {d}:",
        "{d} के लिए इन बातों पर नज़र रखें:",
        "{d} ke liye in baaton par dhyan ya nazar rakhein:",
    ),
    "why": (
        "{d} is ranked '{tier}' because: severity {sev}/4, impact on daily life {imp}/3{concern}{flag}.",
        "{d} को '{tier}' में रखा गया क्योंकि: गंभीरता {sev}/4, दैनिक जीवन पर असर {imp}/3{concern}{flag}।",
        "{d} ko '{tier}' rank kiya gaya hai kyunki: severity {sev}/4, daily life impact {imp}/3{concern}{flag}.",
    ),
    "concern": (
        ", and it matches what bothers you most",
        "; और यह वही है जो आपको सबसे ज़्यादा परेशान करता है",
        ", aur ye wahi hai jo aapko sabse zyada pareshan karta hai",
    ),
    "flag": (
        ", plus a safety flag was raised for this area",
        "; साथ ही इस क्षेत्र के लिए एक सुरक्षा चेतावनी है",
        ", sath hi is area ke liye safety flag raise hua hai",
    ),
    "flags_none": (
        "Nothing in your answers raised an urgent flag. If symptoms change fast or worry you, see a clinician.",
        "आपके जवाबों में कोई तुरंत वाली चेतावनी नहीं मिली। लक्षण तेज़ी से बदलें या चिंता हो तो डॉक्टर से मिलें।",
        "Aapke answers mein koi urgent flag nahi mila. Agar symptoms tezi se badlein ya worry karein toh clinician se zaroor milein.",
    ),
    "life": (
        "I can't give a personal diet or exercise plan. For {d} you can track: {x}. A clinician or registered dietitian can tailor advice to you.",
        "मैं व्यक्तिगत डाइट या एक्सरसाइज़ प्लान नहीं दे सकती। {d} के लिए आप ये नोट कर सकती हैं: {x}। डॉक्टर या डायटीशियन आपके लिए सही सलाह देंगे।",
        "Main personal diet ya exercise plan nahi de sakti. {d} ke liye aap ye track kar sakti hain: {x}. Clinician ya dietitian aapke liye tailored guidance denge.",
    ),
    "fallback": (
        "I don't have verified information to answer that reliably. Here's something useful instead:",
        "इस बारे में मेरे पास भरोसेमंद सत्यापित जानकारी नहीं है। इसकी जगह यह काम आ सकता है:",
        "Is baare mein mere paas verified information nahi hai. Iski jagah ye helpful information dekh sakti hain:",
    ),
}


def _detect_user_language(text: str) -> str:
    """Detects whether user is speaking in Hindi (Devanagari), Gujarati, Hinglish (Latin), or English."""
    if not text:
        return "en"
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    if re.search(r"[\u0A80-\u0AFF]", text):
        return "gu"

    words = set(re.findall(r"[a-zA-Z]+", text.lower()))
    if not words:
        return "en"

    english_stopwords = {
        "i", "am", "not", "my", "the", "is", "are", "was", "were", "you", "your",
        "what", "why", "how", "when", "where", "which", "who", "with", "from",
        "have", "has", "had", "do", "does", "did", "feel", "feeling", "fine",
        "help", "can", "could", "should", "would", "please", "tell", "about",
        "good", "bad", "pain", "doctor", "periods", "cycle", "medicine", "hello", "hi"
    }

    distinct_hinglish_markers = {
        "kya", "hai", "hain", "kaise", "kyu", "kyun", "batao", "bataiye", "karo", "kare", "karu", "karein",
        "karna", "karti", "karta", "karte", "mujhe", "mera", "meri", "mere", "aapse", "aapka", "aapki", "aapke",
        "hum", "hume", "nahi", "nahin", "mat", "chahiye", "dard", "kuch", "kuchh", "hoga", "hogi", "honge",
        "raha", "rahi", "rahe", "kab", "kaha", "kahan", "pe", "mein", "mai", "lekin", "bohot", "bahut",
        "jaldi", "samajh", "pareshan", "pareshani", "thoda", "thodi", "baar", "mahina", "mahine", "dawa",
        "dawakhana", "ilaj", "upay", "baat", "bolo", "suno", "didi", "sakhi", "behen", "shuru", "khatam",
        "lena", "leni", "lene", "sakti", "sakta", "sakte", "hoon", "hona", "hota", "hoti", "hote",
        "apne", "apna", "apni", "aata", "aati", "aate", "bhi", "toh", "kaun", "kaunsa", "kaunsi",
        "lagta", "lagti", "dikkat", "dikkatein", "samasya", "puchu", "poochu", "puchein", "poochein", "sawal",
        "kyon", "pehle", "karega", "karegi", "se", "ko", "par"
    }

    hinglish_matches = words.intersection(distinct_hinglish_markers)
    english_matches = words.intersection(english_stopwords)

    if len(hinglish_matches) >= 1 and len(english_matches) == 0:
        return "hinglish"
    if len(hinglish_matches) >= 2 and len(hinglish_matches) >= len(english_matches):
        return "hinglish"
    if len(hinglish_matches) > len(english_matches):
        return "hinglish"

    return "en"


def _t(key: str, lang: str, **kw) -> str:
    idx = 1 if lang == "hi" else (2 if lang == "hinglish" else 0)
    s = T[key][idx]
    return s.format(**kw) if kw else s


def _lang(payload: Dict[str, Any], message: str) -> str:
    detected = _detect_user_language(message)
    if detected in ("hi", "hinglish"):
        return detected
    ui_lang = payload.get("lang")
    if ui_lang in ("hi", "hinglish"):
        return ui_lang
    return detected


def classify(message: str) -> str:
    for name, rx in _I:
        if rx.search(message):
            return name
    return "unknown"


def _focus(result: Dict[str, Any], message: str) -> Dict[str, Any]:
    ranked = result["priority"]["ranked_domains"]
    for d in ranked:
        if _D.get(d["domain"]) and _D[d["domain"]].search(message):
            return d
    return ranked[0]


def _bullets(items: List[str]) -> str:
    return "\n".join(f"• {i}" for i in items)


def _deterministic(intent: str, result: Dict[str, Any], profile: Dict[str, Any], message: str, lang: str) -> Optional[str]:
    if intent == "greeting":
        return _t("greeting", lang)
    if intent == "red_flags":
        flags = result["red_flags"]
        return "\n".join(f"• {f['message']} ({f['urgency']})" for f in flags) if flags else _t("flags_none", lang)
    f = _focus(result, message)
    name_idx = 1 if lang == "hi" else (2 if lang == "hinglish" else 0)
    name = LABEL[f["domain"]][name_idx]
    p = PATHWAYS[f["domain"]]
    if intent == "doctor_questions":
        return _t("doctor_q", lang, d=name) + "\n" + _bullets(p["questions_for_doctor"])
    if intent == "tests":
        return (_t("tests", lang, d=name) + "\n" + _bullets(p["tests_to_ask_about"])) if p["tests_to_ask_about"] else _t("no_tests", lang, d=name)
    if intent == "who_to_see":
        return _t("who", lang, d=name, x=", ".join(p["clinicians"]))
    if intent == "monitor":
        return _t("monitor", lang, d=name) + "\n" + _bullets(p["monitor"])
    if intent == "why_priority":
        concern = _t("concern", lang) if profile.get("main_concern") and \
            CONCERN_TO_DOMAIN.get(profile["main_concern"]) == f["domain"] else ""
        flag = _t("flag", lang) if any(x["domain"] == f["domain"] for x in result["red_flags"]) else ""
        return _t("why", lang, d=name, tier=f["tier"].replace("_", " "), sev=f["severity"], imp=f.get("impact", 0), concern=concern, flag=flag)
    if intent == "lifestyle":
        return _t("life", lang, d=name, x="; ".join(p["monitor"]))
    return None


GROUND_SYSTEM = (
    "You answer ONE question for a PCOS care-navigation app using ONLY the JSON 'evidence' and 'assessment' given. "
    "Never diagnose, never name medicines or doses, never invent facts. If evidence does not answer it, say to ask a clinician. "
    f"Max {MAX_WORDS} words, warm plain language, same language as the question. "
    'Reply ONLY JSON: {"answer": str, "cites": [chunk ids you used]}'
)


def _clean_history(h: Any) -> List[Dict[str, str]]:
    out = []
    for m in (h if isinstance(h, list) else [])[-MAX_HISTORY:]:
        if isinstance(m, dict):
            role = "assistant" if (m.get("role") or m.get("sender")) in ("assistant", "bot") else "user"
            txt = str(m.get("content") or m.get("text") or "")[:300]
            if txt:
                out.append({"role": role, "content": txt})
    return out


def _grounded(message, result, focus, history, client, chunks, lang) -> Optional[Dict[str, Any]]:
    tags = PATHWAYS[focus["domain"]]["kb_tags"]
    ev = retrieve(message, tags, chunks=chunks if chunks is not None else load_chunks())
    if client is None or not ev:
        return None
    allowed = {c["id"] for c in ev}
    payload = {
        "question": message,
        "history": history,
        "assessment": [{"domain": d["domain"], "tier": d["tier"]} for d in result["priority"]["ranked_domains"]],
        "evidence": [{"id": c["id"], "text": c["text"]} for c in ev],
    }
    model = os.environ.get("LLM_MODEL", "meta/llama-3.1-8b-instruct")
    try:
        r = client.chat.completions.create(
            model=model,
            temperature=0.1,
            max_tokens=300,
            messages=[
                {"role": "system", "content": GROUND_SYSTEM},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )
        data = json.loads(r.choices[0].message.content.strip().strip("`").removeprefix("json"))
        ans, cites = str(data["answer"]), list(data.get("cites", []))
        if not cites or not set(cites) <= allowed or BANNED.search(ans) or len(ans.split()) > MAX_WORDS + 20:
            return None
        return {"reply": ans, "cites": cites}
    except Exception:
        return None


def handle_chat(payload: Dict[str, Any], client=None, chunks=None) -> Dict[str, Any]:
    message = str(payload.get("message", "")).strip()[:MAX_MSG]
    if not message:
        return {"error": "message is required", "status": 400}
    profile = payload.get("profile")
    lang = _lang(payload, message)

    s = check_message(message)                      # 1) safety first, before anything else
    if s:
        return {"reply": s["reply"], "route": "safety", "kind": s["kind"], "urgent": s["urgent"], "cites": []}
    if not isinstance(profile, dict):
        return {"error": "profile is required", "status": 400}

    result = assess_profile(profile)                # 2) server-side truth, never client context strings
    intent = classify(message)
    text = _deterministic(intent, result, profile, message, lang)
    if text:                                        # 3) structured answers, no LLM
        return {"reply": text, "route": "deterministic", "intent": intent, "cites": [], "urgent": False}

    focus = _focus(result, message)
    g = _grounded(message, result, focus, _clean_history(payload.get("history")), client, chunks, lang)
    if g:                                           # 4) grounded LLM with cites
        return {**g, "route": "grounded", "intent": intent, "urgent": False}
    name_idx = 1 if lang == "hi" else (2 if lang == "hinglish" else 0)
    name = LABEL[focus["domain"]][name_idx]        # 5) honest fallback
    q = _t("doctor_q", lang, d=name) + "\n" + _bullets(PATHWAYS[focus["domain"]]["questions_for_doctor"])
    return {"reply": _t("fallback", lang) + "\n" + q, "route": "fallback", "intent": intent, "cites": [], "urgent": False}
