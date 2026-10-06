import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from v3.chat import classify

ENGLISH_CASES = [
    # greeting (5)
    ("hi", "greeting"),
    ("hello", "greeting"),
    ("hey", "greeting"),
    ("hi there", "greeting"),
    ("good morning", "greeting"),
    # red_flags (5)
    ("red flag symptoms", "red_flags"),
    ("is this an urgent emergency", "red_flags"),
    ("when should I see a doctor", "red_flags"),
    ("when to go to hospital", "red_flags"),
    ("danger signs to watch out for", "red_flags"),
    # who_to_see (5)
    ("who should I consult", "who_to_see"),
    ("which doctor should I see", "who_to_see"),
    ("what kind of specialist to see", "who_to_see"),
    ("who should I see for this", "who_to_see"),
    ("which clinician can help", "who_to_see"),
    # tests (5)
    ("which tests to ask for", "tests"),
    ("what blood tests do I need", "tests"),
    ("diagnostic tests for PCOS", "tests"),
    ("lab reports to discuss", "tests"),
    ("should I get hormone blood work", "tests"),
    # doctor_questions (5)
    ("what to ask my doctor", "doctor_questions"),
    ("questions to ask my doctor", "doctor_questions"),
    ("what questions should I ask my doctor about medicine options", "doctor_questions"),
    ("things to discuss with doctor", "doctor_questions"),
    ("questions for my doctor consultation", "doctor_questions"),
    # monitor (5)
    ("what should I monitor", "monitor"),
    ("what symptoms to track", "monitor"),
    ("what should I keep an eye on", "monitor"),
    ("how to monitor my health", "monitor"),
    ("things to track daily", "monitor"),
    # why_priority (5)
    ("why is this my priority", "why_priority"),
    ("why is this top priority", "why_priority"),
    ("why was this ranked first", "why_priority"),
    ("why is androgen my priority", "why_priority"),
    ("reason for this priority", "why_priority"),
    # lifestyle (5)
    ("what lifestyle changes should I make", "lifestyle"),
    ("diet recommendations for PCOS", "lifestyle"),
    ("exercise routines to follow", "lifestyle"),
    ("daily nutrition habits", "lifestyle"),
    ("workout and food tips", "lifestyle"),
]

HINGLISH_CASES = [
    # greeting (5)
    ("namaste", "greeting"),
    ("namaste didi", "greeting"),
    ("namaskar", "greeting"),
    ("kaise ho", "greeting"),
    ("kya haal hai", "greeting"),
    # red_flags (5)
    ("urgent doctor kab jana chahiye", "red_flags"),
    ("emergency kab hoti hai", "red_flags"),
    ("khatre ke lakshan kya hain", "red_flags"),
    ("kab doctor ke paas jana hai", "red_flags"),
    ("khatra hone par kya karein", "red_flags"),
    # who_to_see (5)
    ("kaun se doctor ke paas jau", "who_to_see"),
    ("kisko dikhana chahiye", "who_to_see"),
    ("kaunsa specialist dekhna hoga", "who_to_see"),
    ("kis doctor se consult karu", "who_to_see"),
    ("kis doctor ko dikhayein", "who_to_see"),
    # tests (5)
    ("kaun se test karwau", "tests"),
    ("blood test kaun sa karana hai", "tests"),
    ("jaanch karwani hai", "tests"),
    ("lab reports ke baare mein", "tests"),
    ("hormone test karwana hai", "tests"),
    # doctor_questions (5)
    ("doctor se kya puchu", "doctor_questions"),
    ("doctor se kya sawal puchein", "doctor_questions"),
    ("doctor se kya poochna chahiye", "doctor_questions"),
    ("doctor ke samne kya sawal rakhein", "doctor_questions"),
    ("clinician se sawal kya karein", "doctor_questions"),
    # monitor (5)
    ("kya monitor karu", "monitor"),
    ("kya track karein", "monitor"),
    ("kis cheez par nazar rakhu", "monitor"),
    ("kya dhyan rakhna hai", "monitor"),
    ("symptoms ko kaise track karein", "monitor"),
    # why_priority (5)
    ("ye meri priority kyun hai", "why_priority"),
    ("top priority kyu hai", "why_priority"),
    ("pehle kyun rakha", "why_priority"),
    ("kyun hai ye meri priority", "why_priority"),
    ("sabse pehle kyu aaya", "why_priority"),
    # lifestyle (5)
    ("lifestyle tips batao", "lifestyle"),
    ("khana peena kaisa hona chahiye", "lifestyle"),
    ("diet kya honi chahiye", "lifestyle"),
    ("exercise routine kaisa rakhein", "lifestyle"),
    ("rozana kasrat aur khorak", "lifestyle"),
]

HINDI_CASES = [
    # greeting (5)
    ("नमस्ते", "greeting"),
    ("नमस्कार", "greeting"),
    ("प्रणाम", "greeting"),
    ("नमस्ते सखी", "greeting"),
    ("कैसी हैं आप", "greeting"),
    # red_flags (5)
    ("खतरे के लक्षण क्या हैं", "red_flags"),
    ("इमरजेंसी में क्या करें", "red_flags"),
    ("कब डॉक्टर के पास जाना चाहिए", "red_flags"),
    ("आपातकालीन स्थिति कब होती है", "red_flags"),
    ("कब अस्पताल जाएं", "red_flags"),
    # who_to_see (5)
    ("किस डॉक्टर को दिखाना चाहिए", "who_to_see"),
    ("कौन सा विशेषज्ञ देखना होगा", "who_to_see"),
    ("किसे दिखाएं", "who_to_see"),
    ("किस डॉक्टर से परामर्श लें", "who_to_see"),
    ("कौन से डॉक्टर के पास जाएं", "who_to_see"),
    # tests (5)
    ("कौन से टेस्ट करवाने चाहिए", "tests"),
    ("जांच कौन सी करानी है", "tests"),
    ("लैब टेस्ट के बारे में बताएं", "tests"),
    ("ब्लड टेस्ट कौन से जरूरी हैं", "tests"),
    ("हार्मोन टेस्ट की रिपोर्ट", "tests"),
    # doctor_questions (5)
    ("डॉक्टर से क्या पूछें", "doctor_questions"),
    ("डॉक्टर से क्या सवाल करने चाहिए", "doctor_questions"),
    ("डॉक्टर से क्या पूछना चाहिए", "doctor_questions"),
    ("डॉक्टर से बातचीत में क्या सवाल रखें", "doctor_questions"),
    ("डॉक्टर से परामर्श के सवाल", "doctor_questions"),
    # monitor (5)
    ("क्या मॉनिटर करें", "monitor"),
    ("किस पर नज़र रखें", "monitor"),
    ("किन लक्षणों को ट्रैक करें", "monitor"),
    ("निगरानी किस बात की करें", "monitor"),
    ("किन बातों का ध्यान रखें", "monitor"),
    # why_priority (5)
    ("यह मेरी प्राथमिकता क्यों है", "why_priority"),
    ("टॉप प्रायोरिटी क्यों है", "why_priority"),
    ("प्राथमिकता क्यों दी गई", "why_priority"),
    ("सबसे पहले क्यों चुना गया", "why_priority"),
    ("क्यों है यह प्राथमिक", "why_priority"),
    # lifestyle (5)
    ("जीवनशैली में क्या बदलाव करें", "lifestyle"),
    ("आहार और खान-पान कैसा हो", "lifestyle"),
    ("व्यायाम की दिनचर्या", "lifestyle"),
    ("डाइट और पोषण संबंधी सुझाव", "lifestyle"),
    ("रोजाना खान पान और कसरत", "lifestyle"),
]


@pytest.mark.parametrize("text,expected_intent", ENGLISH_CASES)
def test_english_intent_classification(text, expected_intent):
    assert classify(text) == expected_intent, f"Failed for English text: '{text}'"


@pytest.mark.parametrize("text,expected_intent", HINGLISH_CASES)
def test_hinglish_intent_classification(text, expected_intent):
    assert classify(text) == expected_intent, f"Failed for Hinglish text: '{text}'"


@pytest.mark.parametrize("text,expected_intent", HINDI_CASES)
def test_hindi_intent_classification(text, expected_intent):
    assert classify(text) == expected_intent, f"Failed for Hindi text: '{text}'"


def test_intent_counts():
    assert len(ENGLISH_CASES) >= 40
    assert len(HINGLISH_CASES) >= 40
    assert len(HINDI_CASES) >= 40


def test_word_boundaries_no_false_triggers():
    # 'name' inside 'username' must not trigger greeting
    assert classify("what is my username") != "greeting"
    # 'name' inside 'surname' must not trigger greeting
    assert classify("what is the surname") != "greeting"
    # 'test' not inside other words
    assert classify("attestation process") != "tests"
