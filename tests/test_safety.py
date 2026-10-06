import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
import pytest
from v3.safety import check_message


@pytest.mark.parametrize("t", [
    "I want to die",
    "mujhe jeene ka mann nahi karta",
    "main marna chahti hoon",
    "मुझे जीने का मन नहीं करता",
    "मैं आत्महत्या के बारे में सोच रही हूँ",
    "thinking of suicide"
])
def test_crisis(t):
    r = check_message(t)
    assert r and r["kind"] == "crisis" and r["urgent"] and "14416" in r["reply"]


@pytest.mark.parametrize("t", [
    "metformin 500 mg kitni leni chahiye",
    "what dose of spironolactone",
    "कितनी गोली लेनी चाहिए"
])
def test_dose(t):
    assert check_message(t)["kind"] == "dose"


@pytest.mark.parametrize("t", [
    "do I have PCOS?",
    "kya mujhe PCOS hai",
    "mujhe pcod hai kya"
])
def test_diagnose(t):
    assert check_message(t)["kind"] == "diagnose"


@pytest.mark.parametrize("t", [
    "What should I ask my doctor first?",
    "mere period irregular kyun hain",
    "facial hair ke liye kaun sa doctor"
])
def test_safe_passthrough(t):
    assert check_message(t) is None


def test_hindi_reply_for_hindi_input():
    reply = check_message("जीने का मन नहीं")["reply"]
    assert "Tele-MANAS" in reply and "खेद" in reply
