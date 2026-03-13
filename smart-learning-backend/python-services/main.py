from flask import Flask
from flask_cors import CORS

# Import the Blueprints
from reading_ai import reading_bp
from spellbee_ai import spellbee_bp
from wordbot_ai import wordbot_bp
from writing_ai import writing_bp

# Create main Flask app
app = Flask(__name__)
CORS(app)

# Register Blueprints with URL prefixes
app.register_blueprint(reading_bp, url_prefix="/reading")
app.register_blueprint(spellbee_bp, url_prefix="/spellbee")
app.register_blueprint(wordbot_bp, url_prefix="/wordbot")
app.register_blueprint(writing_bp, url_prefix="/writing")

# Run the main server
if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    print("Writing practice endpoint is available at http://localhost:5000/writing/predict")
    app.run(port=5000, debug=True)
