# 🚀 Smart Learning -- AI Powered Dyslexia Friendly Learning Platform

![AI](https://img.shields.io/badge/AI-Powered-blue)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-green)
![Node](https://img.shields.io/badge/Backend-Node.js-orange)
![Python](https://img.shields.io/badge/AI%20Services-Python-red)
![TensorFlow](https://img.shields.io/badge/ML-TensorFlow-yellow)
![License](https://img.shields.io/badge/License-MIT-purple)

Smart Learning is an **AI-powered assistive education platform designed
to help students with dyslexia improve reading, spelling, and writing
skills through interactive learning tools.**

The system combines **React frontend, Node backend, and Python AI
services** to deliver intelligent learning modules powered by **machine
learning, speech recognition, and conversational AI**.

---

# 🌟 Key Features

## 🔤 Alphabet Recognition

- CNN model trained using **EMNIST dataset**
- Detects handwritten alphabets
- Helps learners practice writing letters

## 📖 Reading Assistant

- Speech recognition based reading practice
- Detects pronunciation errors
- Provides corrective feedback

## 🐝 Spell Bee AI

- AI-powered spelling challenges
- Speech-to-text spelling validation
- Interactive spelling practice

## ✍ Writing Assistance

- Handwriting recognition
- Alphabet practice evaluation

## 🤖 WordBot AI

- AI chatbot for vocabulary learning
- Provides word meanings and usage

## 🎨 Dyslexia Friendly UI

- Minimal distractions
- Clear typography
- Accessibility focused design

---

# 🧠 System Architecture

    SMART LEARNING
    │
    ├── frontend (React + Vite + Tailwind)
    │
    ├── smart-learning-backend
    │     ├── node-backend (Express API)
    │     └── python-services (AI + ML models)
    │
    ├── datasets
    ├── trained models
    └── notebooks

---

# 🛠 Tech Stack

## Frontend

- React
- Vite
- TailwindCSS
- TypeScript

## Backend

- Node.js
- Express.js
- Firebase Authentication

## AI / Machine Learning

- Python
- TensorFlow / Keras
- EMNIST Dataset
- SpeechRecognition
- Google Gemini API

---

# 📂 Project Structure

    SMART LEARNING
    │
    ├── frontend
    │   ├── src
    │   ├── node_modules
    │   ├── package.json
    │   └── vite.config.ts
    │
    ├── smart-learning-backend
    │   │
    │   ├── node-backend
    │   │     ├── server.js
    │   │     └── package.json
    │   │
    │   └── python-services
    │         ├── main.py
    │         ├── reading_ai.py
    │         ├── spellbee_ai.py
    │         ├── wordbot_ai.py
    │         ├── writing_ai.py
    │         ├── requirements.txt
    │         └── trained models (.h5 / .keras)
    │
    ├── Alphabet_Recognition.ipynb
    ├── writing1.ipynb
    ├── data.csv
    └── README.md

---

# ⚙ Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/smart-learning.git
cd smart-learning
```

---

# 🚀 Run Frontend

    cd frontend
    npm install
    npm run dev

Frontend will start at

    http://localhost:5173

---

# 🚀 Run Node Backend

    cd smart-learning-backend/node-backend
    npm install
    node server.js

Server runs at

    http://localhost:5000

---

# 🚀 Run Python AI Services

Create virtual environment

    cd smart-learning-backend/python-services
    python -m venv venv

Activate environment (Windows)

    venv\Scripts\activate

Install dependencies

    pip install -r requirements.txt

Run AI service

    python main.py

---

# 🔑 Environment Variables

Create `.env` file inside python-services

    GEMINI_API_KEY=your_api_key_here

Frontend `.env`

    VITE_API_URL=http://localhost:5000

---

# 📊 Machine Learning Models

  Model                Purpose

---

  EMNIST CNN           Alphabet Recognition
  Custom CNN           Handwriting Detection
  Speech Recognition   Reading Practice
  Gemini AI            Chatbot Assistance

---

# 🎯 Target Users

- Students with **Dyslexia**
- Early learners
- Special education environments
- Language learners

---

* [ ] 🔮 Future Improvements

- Adaptive learning paths
- Real-time handwriting correction
- Gamified learning modules
- Mobile application version

---

# 👩‍💻 Author

**Shreya Sonpavane**
Engineering Student \| AI Developer

---

# ⭐ Support

If you like this project, please **give it a star ⭐ on GitHub**.
