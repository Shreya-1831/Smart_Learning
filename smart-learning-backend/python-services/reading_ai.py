# reading_ai.py

from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
import random
import io
import base64
import speech_recognition as sr
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import os
import json
from dotenv import load_dotenv
from pydub import AudioSegment
import difflib
import re


# --- THIS IS THE BLUEPRINT YOUR main.py IMPORTS ---
reading_bp = Blueprint('reading_bp', __name__)


# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()  # loads variables from .env


# -----------------------------
# Gemini API Setup
# -----------------------------
api_key = os.getenv("READING_GEMINI_API_KEY")
modelName = os.getenv("GEMINI_API_MODEL")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")


genai.configure(api_key=api_key)


# Set up the model with generation config for JSON and safety settings
generation_config = {
    "response_mime_type": "application/json",
}

safety_settings = {
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

model = genai.GenerativeModel(
    model_name=modelName,
    generation_config=generation_config,
    safety_settings=safety_settings
)


# -----------------------------
# --- (UPDATED) Helper: Speech Sentiment Analysis ---
# -----------------------------
def analyze_sentiment_from_audio(audio_base64):
    try:
        # 1. Decode base64 string
        audio_data = audio_base64.split(',')[1]
        audio_bytes = base64.b64decode(audio_data)
        audio_stream = io.BytesIO(audio_bytes)


        # 2. Convert audio from WebM (browser default) to WAV
        try:
            audio_segment = AudioSegment.from_file(audio_stream)
        except Exception as pydub_error:
            print("---------------------------------------------------")
            print(f"PYDUB ERROR: {pydub_error}")
            print("This error strongly suggests FFmpeg is not installed or not in your system's PATH.")
            print("Please install FFmpeg to allow audio conversion.")
            print("---------------------------------------------------")
            raise pydub_error # Re-raise to trigger the 500 error, as this is fatal


        # 3. Export to a WAV format in memory
        wav_stream = io.BytesIO()
        audio_segment.export(wav_stream, format="wav")
        wav_stream.seek(0)


        # 4. Use speech_recognition on the WAV data
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_stream) as source:
            audio = recognizer.record(source)

        # 5. Transcribe
        try:
            text = recognizer.recognize_google(audio)
            print(f"Transcribed Text: {text}")
        except sr.UnknownValueError:
            # Speech recognition couldn't understand audio
            print("Google Speech Recognition could not understand audio")
            text = "" # Set text to empty, don't crash
        except sr.RequestError as e:
            # API was unreachable or other request issue
            print(f"Could not request results from Google Speech Recognition service; {e}")
            text = "" # Set text to empty, don't crash


        # 6. Perform sentiment analysis
        positive_keywords = ['happy', 'great', 'fun', 'good', 'love', 'smile', 'excited']
        negative_keywords = ['sad', 'bored', 'tired', 'bad', 'angry', 'cry']


        text_lower = text.lower()

        if not text: # Handle empty transcription
            sentiment = "Neutral"
        elif any(word in text_lower for word in positive_keywords):
            sentiment = "Positive"
        elif any(word in text_lower for word in negative_keywords):
            sentiment = "Negative"
        else:
            sentiment = "Neutral"


        return sentiment, text

    except Exception as e:
        # This will now primarily catch the FFmpeg/pydub errors
        print(f"FATAL Error in analyze_sentiment_from_audio: {e}")
        raise e # Re-raise to be caught by the route's 500 handler


# -----------------------------
# --- NEW HELPER: Text Normalization ---
# -----------------------------
def normalize_text(text):
    """
    Lowercase, remove punctuation, and split text into a list of words.
    """
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)  # Remove punctuation
    return text.split()


# -----------------------------
# --- NEW HELPER: Pronunciation Scoring ---
# -----------------------------
def calculate_pronunciation_score(expected_text, actual_text):
    """
    Compares expected text with actual transcribed text to generate
    a score and word-by-word feedback.
    """
    expected_words = normalize_text(expected_text)
    actual_words = normalize_text(actual_text)


    if not expected_words:
        return 0, []  # Avoid division by zero

    # Handle case where transcription is empty
    if not actual_words:
        score = 0
        feedback_details = []
        for word in expected_words:
            feedback_details.append({"word": word, "status": "missed"})
        return score, feedback_details


    # Use difflib's SequenceMatcher to get a score
    s = difflib.SequenceMatcher(None, expected_words, actual_words)
    score = round(s.ratio() * 100)


    # --- Generate detailed feedback for the UI ---
    feedback_details = []
    opcodes = s.get_opcodes()


    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'equal':
            # Words matched
            for word in expected_words[i1:i2]:
                feedback_details.append({"word": word, "status": "correct"})
        elif tag == 'replace':
            # User said different words
            # We show the *expected* word as incorrect
            for i in range(i1, i2):
                feedback_details.append({"word": expected_words[i], "status": "incorrect"})
        elif tag == 'delete':
            # User missed these words
            for word in expected_words[i1:i2]:
                feedback_details.append({"word": word, "status": "missed"})
        elif tag == 'insert':
            # User added extra words (we ignore this for this feedback)
            pass


    return score, feedback_details



# -----------------------------
# ROUTE 1: Generate Passage (--- FIXED ---)
# -----------------------------
@reading_bp.route('/passage', methods=['GET'])
def generate_passage():
    try:
        prompt = (
            "Write a short, 3-4 sentence reading passage for kids aged 6–10. "
            "It should be cheerful, imaginative, and use simple English. "
            "Return your answer as a JSON object with three keys: "
            "'title' (a string), "
            "'text' (a string), and "
            "'difficulty' (one of 'Easy', 'Medium', or 'Hard')."
        )


        response = model.generate_content(prompt)

        # Check for safety blocks
        if not response.candidates or response.candidates[0].finish_reason == 2:
            print("⚠️ Response blocked by safety filter, using fallback")
            raise ValueError("Safety block")

        data = json.loads(response.text)
        return jsonify(data)


    except Exception as e:
        print(f"Error generating passage: {e}")
        # Fallback
        return jsonify({
            "title": "The Friendly Bear",
            "text": "A friendly bear lived in the woods. He loved to eat honey and wave to all the birds. One day, he found a shiny red ball to play with.",
            "difficulty": "Easy"
        }), 200


# -----------------------------
# ROUTE 2: Analyze Voice (--- UPDATED ERROR HANDLING ---)
# -----------------------------
@reading_bp.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()

        # --- UPDATED: Get both audio and text ---
        audio_base64 = data.get('audioBase64')
        passage_text = data.get('passageText') # <-- NEW


        if not audio_base64 or not passage_text:
            return jsonify({"error": "Missing audioBase64 or passageText"}), 400


        # --- This now uses the updated function to process REAL audio ---
        sentiment, transcribed_text = analyze_sentiment_from_audio(audio_base64)
        print(f"Detected Sentiment: {sentiment}")


        # --- NEW: Call the scoring function ---
        pronunciation_score, feedback = calculate_pronunciation_score(passage_text, transcribed_text)
        print(f"Pronunciation Score: {pronunciation_score}%")


        # --- This logic for adjusting the *next* passage is unchanged ---
        if sentiment in ["Negative", "Neutral"]:
            tone_prompt = (
                f"The child sounded {sentiment.lower()}. "
                "Generate a short cheerful and confidence-boosting reading passage for a dyslexic child, "
                "in simple English, to uplift their mood and encourage them to keep reading. "
                "Include a title and a friendly message at the end. "
                "Return as a JSON object with 'title' and 'text' keys."
            )

            try:
                tone_response = model.generate_content(tone_prompt)

                # Check for safety blocks
                if not tone_response.candidates or tone_response.candidates[0].finish_reason == 2:
                    print("⚠️ Response blocked by safety filter for adjusted passage")
                    raise ValueError("Safety block")

                data = json.loads(tone_response.text)


                if isinstance(data, dict):
                    title = data.get('title', 'A Little Boost!')
                    text = data.get('text', 'You are doing a great job! Keep trying!')
                else:
                    print(f"Unexpected Gemini response format: {data}")
                    title = "A Little Boost!"
                    text = "You are doing a great job! Keep trying!"

            except Exception as e:
                print(f"Error generating adjusted passage: {e}")
                title = "A Little Boost!"
                text = "You are doing a great job! Keep trying!"

            # Format as markdown for the "Teacher's Note"
            adjusted_passage = f"**{title}**\n\n{text}"
        else:
            adjusted_passage = (
                "Great job! Keep up the good reading! You sound wonderful today! 🌟"
            )


        # --- UPDATED: Return the new score and feedback ---
        return jsonify({
            "sentiment": sentiment,
            "transcribed": transcribed_text,
            "score": pronunciation_score,    # This is now the real score
            "feedback": feedback,            # The new word-by-word list
            "adjusted_passage": adjusted_passage
        })


    except Exception as e:
        print(f"Error in /analyze route: {e}") 
        return jsonify({"error": str(e)}), 500
