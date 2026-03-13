# spellbee_ai.py

import os
import io
import base64
import json
import random
from flask import Blueprint, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
from pydub import AudioSegment
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from dotenv import load_dotenv
import difflib

# ==============================
# Load Environment Variables
# ==============================
load_dotenv()

# ==============================
# Blueprint Setup
# ==============================
spellbee_bp = Blueprint('spellbee_bp', __name__)
CORS(spellbee_bp)

modelName = os.getenv("GEMINI_API_MODEL")
api_key = os.getenv("SPELLBEE_GEMINI_API_KEY")

# ==============================
# Gemini Configuration
# ==============================
model = None

try:
    if api_key:

        genai.configure(api_key=api_key)

        safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        model = genai.GenerativeModel(
            model_name=modelName,
            safety_settings=safety_settings
        )

        print("✅ Gemini configured for SpellBee")

    else:
        print("⚠️ No Gemini API — using dyslexia-friendly local generator")

except Exception as e:
    print("❌ Gemini config failed:", e)
    model = None


# ==============================
# In-Memory Storage
# ==============================
leaderboard_data = []
words_cache = []

# ==============================
# Dyslexia-Friendly Word Bank
# ==============================
word_bank = [
    "cat","dog","sun","tree","ball","book","milk","cake",
    "apple","train","green","house","river","music","happy",
    "school","garden","butterfly","teacher","rocket",
    "planet","friend","flower","family","pencil",
    "banana","orange","tiger","panda","zebra"
]

# ==============================
# Helper: Generate phonetic hint
# ==============================
def create_hint(word):
    return "-".join(list(word))


# ==============================
# Generate Dyslexia Friendly Words
# ==============================
def generate_spellbee_words():

    selected = random.sample(word_bank, 8)

    words = []

    for i, word in enumerate(selected):

        length = len(word)

        if length <= 4:
            difficulty = "Easy"
            points = 10
        elif length <= 6:
            difficulty = "Medium"
            points = 20
        else:
            difficulty = "Hard"
            points = 30

        words.append({
            "id": i+1,
            "word": word,
            "difficulty": difficulty,
            "points": points,
            "hint": create_hint(word),  # dyslexia phonetic hint
            "message": "Listen carefully and spell slowly 💡"
        })

    return words


# ==============================
# GET WORDS
# ==============================
@spellbee_bp.route('/words', methods=['GET'])
def get_words():

    global words_cache

    if words_cache:
        return jsonify(words_cache)

    # ---------- Try Gemini ----------
    if model:

        try:

            prompt = """
            Generate 8 spelling bee words for dyslexic children age 8–10.

            Rules:
            - mostly short phonetic words
            - mix easy and medium difficulty
            - include id, word, difficulty, points
            """

            response = model.generate_content(prompt)

            if not response.candidates:
                raise ValueError("Empty Gemini response")

            text = response.text.strip()
            text = text.replace("```json","").replace("```","")

            words_cache = json.loads(text)

            # Add hints
            for w in words_cache:
                w["hint"] = create_hint(w["word"])
                w["message"] = "Take your time and spell clearly 🌟"

            return jsonify(words_cache)

        except Exception as e:
            print("⚠️ Gemini failed:", e)

    # ---------- Local fallback ----------
    words_cache = generate_spellbee_words()

    return jsonify(words_cache)


# ==============================
# Evaluate Spelling (Dyslexia Friendly)
# ==============================
@spellbee_bp.route('/evaluate', methods=['POST'])
def evaluate():

    data = request.get_json()

    if not data or 'audioBase64' not in data or 'targetWord' not in data:
        return jsonify({"error": "Missing audioBase64 or targetWord"}), 400

    target_word = data['targetWord'].lower().strip()
    audio_base64 = data['audioBase64']

    try:

        header, encoded = audio_base64.split(",", 1)
        audio_bytes = base64.b64decode(encoded)

        audio_stream = io.BytesIO(audio_bytes)

        audio = AudioSegment.from_file(audio_stream)

        wav_stream = io.BytesIO()
        audio.export(wav_stream, format="wav")
        wav_stream.seek(0)

        recognizer = sr.Recognizer()

        with sr.AudioFile(wav_stream) as source:
            audio_data = recognizer.record(source)

        try:

            recognized = recognizer.recognize_google(audio_data).lower()

            recognized = recognized.replace(".", "").replace(",", "").strip()

            spelled = recognized.replace(" ", "").replace("-", "")

            # similarity score (better for dyslexia)
            similarity = difflib.SequenceMatcher(None, spelled, target_word).ratio()

            accuracy = int(similarity * 100)

            is_correct = accuracy > 85

            if is_correct:
                message = "Great job! 🎉 You spelled it correctly."
            elif accuracy > 60:
                message = "Almost there! Try again slowly 💡"
            else:
                message = "Good effort! Let's try again together 🌱"

            return jsonify({
                "recognized": spelled,
                "target": target_word,
                "accuracy": accuracy,
                "isCorrect": is_correct,
                "message": message
            })

        except sr.UnknownValueError:

            return jsonify({
                "recognized": "",
                "accuracy": 0,
                "isCorrect": False,
                "message": "I couldn't hear clearly. Please try again slowly."
            })

    except Exception as e:

        print("Audio error:", e)

        return jsonify({"error": str(e)}), 500


# ==============================
# Leaderboard
# ==============================
@spellbee_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():

    return jsonify(
        sorted(leaderboard_data, key=lambda x: x['score'], reverse=True)[:10]
    )


@spellbee_bp.route('/leaderboard', methods=['POST'])
def add_to_leaderboard():

    data = request.get_json()

    if not data or 'name' not in data or 'score' not in data:
        return jsonify({"error": "Missing name or score"}), 400

    entry = {
        "name": data['name'],
        "score": data['score']
    }

    leaderboard_data.append(entry)

    return jsonify({
        "status": "success",
        "entry": entry
    }), 201