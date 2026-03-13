from flask import request, jsonify, Blueprint
import numpy as np
import tensorflow as tf
import base64
import io
from PIL import Image, ImageOps
import os # Import os to check for model file

# --- Model Loading ---
MODEL_FILE = "Alphabet_Recognition.keras"

# Check if model file exists before trying to load
if not os.path.exists(MODEL_FILE):
    print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print(f"FATAL ERROR: Model file not found.")
    print(f"Please make sure '{MODEL_FILE}' is in the same directory as this script.")
    print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    model = None
else:
    try:
        model = tf.keras.models.load_model(MODEL_FILE)
        print(f"Successfully loaded model '{MODEL_FILE}'.")
    except Exception as e:
        print(f"Error loading model '{MODEL_FILE}': {e}")
        model = None

# Create a Blueprint for this route
writing_bp = Blueprint('writing_bp', __name__)

# --- CORRECT MAPPING ---
# This matches your training script which filtered for 52 classes (A-Z, a-z)
# and remapped them to indices 0-51.
target_names_upper = [chr(i) for i in range(65, 91)]  # A-Z (Indices 0-25)
target_names_lower = [chr(i) for i in range(97, 123)] # a-z (Indices 26-51)
model_labels = target_names_upper + target_names_lower # 52 labels total


def process_image(image_data):
    """
    Decodes, inverts, crops, resizes, and centers the image.
    """
    try:
        # 1. Decode, convert to grayscale, and invert colors
        img_data = base64.b64decode(image_data.split(',')[1])
        img = Image.open(io.BytesIO(img_data))
        img = img.convert('L')
        img = ImageOps.invert(img) # Canvas is black-on-white, EMNIST is white-on-black

        # 2. Find and crop to the bounding box of the drawing
        bbox = img.getbbox()
        if not bbox:
            print("No drawing found in image (image might be blank).")
            return None
        img_cropped = img.crop(bbox)

        # 3. Resize the character to fit within a 20x20 box, preserving aspect ratio
        width, height = img_cropped.size
        target_size = 20 # Fit within 20x20 to add padding

        if width > height:
            scale_factor = target_size / width
            new_width = target_size
            new_height = int(height * scale_factor)
        else:
            scale_factor = target_size / height
            new_height = target_size
            new_width = int(width * scale_factor)

        if new_width == 0: new_width = 1
        if new_height == 0: new_height = 1

        img_resized = img_cropped.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # 4. Create the final 28x28 black canvas and center the resized image
        final_img_pil = Image.new('L', (28, 28), 0) # Black canvas
        paste_x = (28 - new_width) // 2
        paste_y = (28 - new_height) // 2
        final_img_pil.paste(img_resized, (paste_x, paste_y))
        
        # 5. Convert to numpy
        img_np = np.array(final_img_pil) # Shape (28, 28)
        
        # --- THIS WAS THE CRITICAL FIX ---
        # The rotation/flip was incorrect for your model.
        # Commenting these lines out makes the preprocessing match
        # your other working script.
        # img_np = np.rot90(img_np, k=1) # Rotate 90 degrees clockwise
        # img_np = np.flipud(img_np)     # Flip vertically
        
        # 6. Normalize and expand dimensions for the model
        final_np = np.expand_dims(img_np, axis=(0, -1)) # Shape (1, 28, 28, 1)
        final_np = final_np.astype(np.float32) / 255.0

        return final_np

    except Exception as e:
        print(f"Error processing image: {e}")
        return None

@writing_bp.route('/predict', methods=['POST'])
def predict():
    if model is None:
        print("Model is not loaded. Cannot predict.")
        return jsonify({"error": "Model is not loaded on server"}), 500
        
    data = request.get_json()
    if 'image' not in data:
        return jsonify({"error": "No image data found"}), 400
        
    image_data = data['image']
    processed_img = process_image(image_data)

    if processed_img is None:
        print("Image processing returned None. Assuming blank canvas.")
        return jsonify({"predicted_letter": ""}) # Return empty, not an error

    try:
        # Get the model's predictions (this is an array of 52 probabilities)
        prediction_array = model.predict(processed_img)[0]
    except Exception as e:
        print(f"Error during model prediction: {e}")
        return jsonify({"error": "Model prediction failed"}), 500

    # Find the best prediction
    best_letter_index = np.argmax(prediction_array)
    best_letter_prob = prediction_array[best_letter_index]
    
    predicted_char = "" # Default to empty/unknown

    # --- Confidence Threshold ---
    CONFIDENCE_THRESHOLD = 0.05 
    if best_letter_prob > CONFIDENCE_THRESHOLD:
        predicted_char = model_labels[best_letter_index]
    else:
        print(f"Confidence ({best_letter_prob:.2f}) is below threshold of {CONFIDENCE_THRESHOLD}. Rejecting guess.")

    print(f"Final Prediction: '{predicted_char}' (Prob: {best_letter_prob:.2f}), Index: {best_letter_index}")

    return jsonify({"predicted_letter": predicted_char})