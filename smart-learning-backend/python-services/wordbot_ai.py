# wordbot_ai.py

from flask import Flask, jsonify, request, Blueprint
import random
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from dotenv import load_dotenv
import os


# Load .env file
load_dotenv()


# Create Blueprint
wordbot_bp = Blueprint('wordbot_bp', __name__)


# -----------------------------
# Gemini Setup (Safe for Kids)
# -----------------------------
modelName = "gemini-2.5-flash-lite"
# modelName = os.getenv("GEMINI_API_MODEL")
try:
    api_key = os.getenv("WORDBOT_GEMINI_API_KEY")
    genai.configure(api_key=api_key)

    safety_settings = {
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    model = genai.GenerativeModel(
        model_name=modelName,
        generation_config={
            "temperature": 0.4,
            "max_output_tokens": 6,
            "top_p": 0.9,
        },
        safety_settings=safety_settings
    )
    print("✅ Gemini API configured successfully for WordBot.")
except Exception as e:
    print("❌ Error configuring Gemini API:", e)
    model = None


# -----------------------------
# Friendly fallback words
# -----------------------------
FALLBACK_WORDS = {
    'A': ["ANT", "ARM", "AXE", "APE", "ART", "ACE"],
    'B': ["BAT", "BED", "BUS", "BOX", "BEE", "BAG", "BIT"],
    'C': ["CAT", "CAR", "CUP", "COW", "CAN", "CUB", "CAP"],
    'D': ["DOG", "DAY", "DAD", "DEN", "DOT", "DIG", "DAM"],
    'E': ["EGG", "ELF", "EAR", "END", "EYE"],
    'F': ["FOX", "FAN", "FIN", "FIG", "FLY", "FUR", "FOG"],
    'G': ["GAS", "GUM", "GYM", "GAP", "GUT", "GOT"],
    'H': ["HAT", "HEN", "HUT", "HOP", "HUG", "HAM", "HIT"],
    'I': ["INK", "ICE", "IMP", "ILL"],
    'J': ["JAM", "JET", "JOG", "JAR", "JOY"],
    'K': ["KEY", "KIT", "KID", "KIN"],
    'L': ["LOG", "LEG", "LID", "LAP", "LIT", "LAD"],
    'M': ["MAP", "MOP", "MUD", "MAT", "MUG", "MAN", "MIX"],
    'N': ["NET", "NUT", "NAP", "NOD", "NIT"],
    'O': ["OWL", "OAK", "ORB", "ODD", "OPT"],
    'P': ["PEN", "PIG", "POT", "PAN", "PET", "PAT", "PIT"],
    'Q': ["QUIT", "QUAD"],
    'R': ["RAT", "RUG", "ROD", "RUN", "RIM", "RAG"],
    'S': ["SUN", "SAT", "SIT", "SKY", "SAW", "SOB", "SIX"],
    'T': ["TOP", "TEN", "TUB", "TIP", "TOY", "TAN", "TAR"],
    'U': ["URN", "USE"],
    'V': ["VAN", "VET", "VOW", "VIA"],
    'W': ["WIG", "WEB", "WET", "WAX", "WIN", "WAR"],
    'X': ["XRAY"],
    'Y': ["YAK", "YES", "YAM", "YET"],
    'Z': ["ZOO", "ZIP", "ZAP", "ZEN"]
}


# ----------------------------------------------------------
# Gemini word generator (controlled & dyslexia-friendly)
# ----------------------------------------------------------
def get_gemini_easy_word(start_letter, used_words):
    prompt = f"One simple 3-5 letter word starting with '{start_letter}'. Just the word."

    try:
        response = model.generate_content(prompt)

        # Check for safety blocks or empty response
        if not response.candidates:
            print("⚠️ No candidates returned (safety block)")
            raise ValueError("Safety block - using fallback")

        # Check finish reason
        if response.candidates[0].finish_reason == 2:  # SAFETY
            print("⚠️ Response blocked by safety filter")
            raise ValueError("Safety block - using fallback")

        word = response.text.strip().split()[0].upper()
        word = ''.join([c for c in word if c.isalpha()])  # remove punctuation

        # Validate
        if len(word) < 3 or len(word) > 5:
            raise ValueError("Word length not kid-friendly.")
        if not word.startswith(start_letter.upper()):
            raise ValueError("Incorrect starting letter.")
        if word in used_words:
            raise ValueError("Repeated word.")

        return word

    except Exception as e:
        print(f"⚠️ Using fallback for '{start_letter}': {e}")

        # ✅ FIXED: Use FALLBACK_WORDS dictionary instead of FALLBACK_EASY list
        choices = FALLBACK_WORDS.get(start_letter.upper(), [])
        choices = [w for w in choices if w not in used_words]
        
        if choices:
            return random.choice(choices)

        return "EXIT"  # Child wins


# ----------------------------------------------------------
# Main bot route
# ----------------------------------------------------------
@wordbot_bp.route('/botmove', methods=['POST'])
def botmove():
    data = request.json
    user_word = data.get("word", "").upper()
    used_words = [w.upper() for w in data.get("usedWords", [])]

    # Bot starts the game
    if user_word == "START":
        first = random.choice(["CAT", "DOG", "SUN", "HAT"])
        return jsonify({
            "word": first,
            "points": len(first) * 5,
            "message": "Let's begin! Try your best 😊"
        })

    # Bot responds to child's word
    last_letter = user_word[-1]
    bot_word = get_gemini_easy_word(last_letter, used_words)

    # When Gemini + fallback both fail
    if bot_word == "EXIT":
        return jsonify({
            "word": "EXIT",
            "points": 0,
            "message": "You win! Great job superstar 🌟"
        })

    return jsonify({
        "word": bot_word,
        "points": len(bot_word) * 5,
        "message": "Nice! You're doing amazing 💛"
    })


