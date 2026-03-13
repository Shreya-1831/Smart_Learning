import { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, MicOff, Play, RotateCcw, Trophy, Star, Clock, Heart } from 'lucide-react';
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from 'react-router-dom';

const API_URL = "http://localhost:4000/api";

interface Word {
  id: number;
  word: string;
  difficulty: string;
  points: number;
}

const primeSpeechSynthesis = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn("Speech Synthesis API not supported.");
    return;
  }

  const voices = window.speechSynthesis.getVoices();

  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      console.log("Speech voices loaded.");
    };
  }

  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
  window.speechSynthesis.cancel();
  console.log("Speech Synthesis API primed.");
};

const SpellBeeCompetition = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(true);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userSpelling, setUserSpelling] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [wordsAttempted, setWordsAttempted] = useState(0);
  const [spellError, setSpellError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    primeSpeechSynthesis();
  }, []);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        setIsLoadingWords(true);
        const res = await axios.get(`${API_URL}/words`);
        setWords(res.data);
      } catch (err) {
        console.error("Error fetching words:", err);
        setWords([
          { id: 1, word: 'cat', difficulty: 'Easy', points: 10 },
          { id: 2, word: 'dog', difficulty: 'Easy', points: 10 },
        ]);
      } finally {
        setIsLoadingWords(false);
      }
    };
    fetchWords();
  }, []);

  useEffect(() => {
    if (isStarted && timeLeft > 0 && !showResults && !isEvaluating) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !showResults) {
      handleNextWord();
    }
  }, [isStarted, timeLeft, showResults, isEvaluating]);

  const handleStart = () => {
    if (words.length === 0) return;
    setIsStarted(true);
    setCurrentWordIndex(0);
    setScore(0);
    setShowResults(false);
    setTimeLeft(30);
    setWordsAttempted(0);
  };

  const handlePlayWord = () => {
    if (words.length === 0 || !window.speechSynthesis) {
      console.error("Words not loaded or Speech Synthesis not supported.");
      return;
    }

    window.speechSynthesis.cancel();

    setIsPlaying(true);
    const wordToSpeak = words[currentWordIndex].word;
    console.log(`Attempting to speak: ${wordToSpeak}`);

    const speech = new SpeechSynthesisUtterance(wordToSpeak);
    speech.rate = 0.8;
    speech.lang = 'en-US';

    speech.onend = () => {
      console.log("Speech finished.");
      setIsPlaying(false);
    };

    speech.onerror = (event) => {
      console.error("SpeechSynthesis Error:", event.error);
      alert(`Error playing audio: ${event.error}. Please try again.`);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(speech);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          evaluateSpelling(base64Audio);
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setUserSpelling('');
      setIsCorrect(null);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access was denied. Please allow microphone access in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsEvaluating(true);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const evaluateSpelling = async (audioBase64: string) => {
    const targetWord = words[currentWordIndex].word;
    setWordsAttempted(prev => prev + 1);

    try {
      const res = await axios.post(`${API_URL}/spellbee/evaluate`, {
        userId: userData?.uid || 'guest',
        audioBase64,
        targetWord,
      });

      console.log("Evaluation result:", res.data);
      setUserSpelling(res.data.recognized || "...");

      if (res.data.error) {
        // ❌ User spoke the word instead of spelling
        setSpellError(res.data.error);
        setIsCorrect(false);
        return;
      }

      setSpellError(null);
      setIsCorrect(res.data.isCorrect);

      if (res.data.isCorrect) {
        setScore((prev) => prev + words[currentWordIndex].points);
      }

    } catch (err) {
      console.error("Error evaluating:", err);
      setUserSpelling("Error evaluating");
      setIsCorrect(false);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextWord = () => {
    setUserSpelling('');
    setIsCorrect(null);
    setSpellError(null);
    setIsEvaluating(false);

    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setTimeLeft(30);
    } else {
      setShowResults(true);
      submitFinalScore();
    }
  };

  const submitFinalScore = async () => {
    const accuracy = wordsAttempted > 0 ? Math.round((score / (wordsAttempted * 10)) * 100) : 0;

    try {
      // Submit to progress tracking
      await axios.post(`${API_URL}/spellbee/submit`, {
        userId: userData?.uid || 'guest',
        accuracy: accuracy,
        wordsAttempted: wordsAttempted,
      });

      // Submit to leaderboard
      await axios.post(`${API_URL}/leaderboard`, {
        userId: userData?.uid || 'guest',
        name: userData?.name || 'Anonymous',
        score: score,
      });

      console.log('Spell Bee score saved successfully');
    } catch (error) {
      console.warn('Could not save spell bee score:', error);
    }
  };

  const handleRestart = () => {
    setIsStarted(false);
    setShowResults(false);
    setCurrentWordIndex(0);
    setScore(0);
    setTimeLeft(30);
    setUserSpelling('');
    setIsCorrect(null);
    setWordsAttempted(0);

    const fetchWords = async () => {
      try {
        setIsLoadingWords(true);
        const res = await axios.get(`${API_URL}/words`);
        setWords(res.data);
      } catch (err) {
        console.error("Error fetching words:", err);
      } finally {
        setIsLoadingWords(false);
      }
    };
    fetchWords();
  };

  if (isLoadingWords && !isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-spin">🐝</div>
          <h1 className="text-3xl font-bold text-orange-600">Loading Words...</h1>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-8xl mb-6 animate-bounce">🐝</div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mb-4">
              Spelling Bee Competition
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Listen carefully and spell the word correctly! 🎧
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-12 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-orange-700 mb-6 text-center">How to Play</h2>
              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                  <span className="text-3xl">👂</span>
                  <p className="text-gray-700 font-semibold">Listen to the word being spoken</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                  <span className="text-3xl">🎤</span>
                  <p className="text-gray-700 font-semibold">Record yourself spelling it out loud</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                  <span className="text-3xl">⏱️</span>
                  <p className="text-gray-700 font-semibold">You have 30 seconds per word</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                  <span className="text-3xl">⭐</span>
                  <p className="text-gray-700 font-semibold">Earn points for correct spellings!</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                  <span className="text-3xl">🏆</span>
                  <p className="text-gray-700 font-semibold">Check leaderboard on your dashboard!</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleStart}
                disabled={words.length === 0}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-12 py-6 rounded-full text-2xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-3 disabled:opacity-50"
              >
                <Play className="h-8 w-8" />
                <span>Start Competition</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const totalPossiblePoints = words.reduce((sum, word) => sum + word.points, 0);
    const percentage = totalPossiblePoints > 0 ? Math.round((score / totalPossiblePoints) * 100) : 0;

    return (
      <div className="min-h-screen py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-9xl mb-4 animate-bounce">🏆</div>
            </div>
            <h2 className="text-4xl font-bold text-orange-700 mb-6 text-center">
              Competition Complete!
            </h2>

            <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-orange-600 mb-2">{score}</div>
                <p className="text-xl text-gray-700 font-semibold">Total Points Earned</p>
                <div className="mt-4">
                  <div className="flex items-center justify-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-8 w-8 ${i < Math.floor(percentage / 20)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <p className="text-lg text-gray-600 mt-2 font-semibold">{percentage}% Accuracy</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 mb-8">
              <div className="text-center">
                <Trophy className="h-12 w-12 mx-auto mb-3 text-purple-600" />
                <p className="text-lg font-bold text-purple-700 mb-2">Your score has been saved!</p>
                <p className="text-gray-600">Check the leaderboard on your dashboard to see your rank 🎯</p>
              </div>
            </div>

            <div className="text-center space-y-4">
              <button
                onClick={handleRestart}
                className="w-full bg-gradient-to-r from-purple-400 to-pink-500 text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3"
              >
                <RotateCcw className="h-6 w-6" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => navigate('/student-dashboard')}
                className="w-full bg-gradient-to-r from-blue-400 to-cyan-500 text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (words.length === 0 || !words[currentWordIndex]) {
    return <div className="min-h-screen flex items-center justify-center">Error loading words. Please try again.</div>
  }

  const currentWord = words[currentWordIndex];

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-4 text-white text-center shadow-lg">
            <p className="text-lg font-semibold mb-1">Word Progress</p>
            <p className="text-2xl font-bold">{currentWordIndex + 1}/{words.length}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white text-center shadow-lg">
            <p className="text-lg font-semibold mb-1 flex items-center justify-center space-x-1">
              <Trophy className="h-5 w-5" />
              <span>Score</span>
            </p>
            <p className="text-2xl font-bold">{score} pts</p>
          </div>
          <div className={`bg-gradient-to-br rounded-2xl p-4 text-white text-center shadow-lg ${timeLeft <= 10 ? 'from-red-400 to-red-600 animate-pulse' : 'from-blue-400 to-blue-600'
            }`}>
            <p className="text-lg font-semibold mb-1 flex items-center justify-center space-x-1">
              <Clock className="h-5 w-5" />
              <span>Time Left</span>
            </p>
            <p className="text-2xl font-bold">{timeLeft}s</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-2xl mb-8">
          <div className="text-center mb-8">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6 ${currentWord.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
              currentWord.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
              {currentWord.difficulty} - {currentWord.points} points
            </span>

            <div className="text-8xl mb-6 animate-pulse">🎧</div>
            <h2 className="text-3xl font-bold text-purple-700 mb-6">
              Listen to the word
            </h2>

            <button
              onClick={handlePlayWord}
              disabled={isPlaying}
              className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-3 mb-8 disabled:opacity-50"
            >
              <Volume2 className="h-6 w-6" />
              <span>{isPlaying ? 'Playing...' : 'Play Word'}</span>
            </button>
          </div>

          <div className="border-t-2 border-gray-200 pt-8">
            <h3 className="text-2xl font-bold text-purple-700 text-center mb-6">
              Now spell it out loud!
            </h3>

            <div className="flex flex-col items-center space-y-6">
              <button
                onClick={handleRecordToggle}
                disabled={isEvaluating}
                className={`w-32 h-32 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center ${isRecording
                  ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse'
                  : 'bg-gradient-to-br from-green-400 to-emerald-500'
                  } disabled:opacity-50`}
              >
                {isRecording ? (
                  <MicOff className="h-16 w-16 text-white" />
                ) : (
                  <Mic className="h-16 w-16 text-white" />
                )}
              </button>

              <p className="text-lg font-semibold text-gray-700">
                {isRecording ? 'Recording... Tap to stop' :
                  isEvaluating ? 'Evaluating...' : 'Tap to record'}
              </p>

              {userSpelling && (
                <div className={`bg-white rounded-2xl p-6 w-full shadow-lg border-4 ${spellError
                    ? 'border-orange-500'
                    : isCorrect === true
                      ? 'border-green-500'
                      : isCorrect === false
                        ? 'border-red-500'
                        : 'border-transparent'
                  }`}>
                  <p className="text-sm text-gray-600 mb-2">You said:</p>
                  <p className="text-3xl font-bold text-purple-700">{userSpelling}</p>

                  {spellError && (
                    <p className="text-orange-600 font-bold mt-3">
                      ⚠️ {spellError}
                      <br />
                      <span className="text-sm font-semibold">
                        Example: a - p - p - l - e
                      </span>
                    </p>
                  )}

                  {isCorrect === true && (
                    <p className="text-green-600 font-bold mt-2">
                      ✅ Correct! +{currentWord.points} points
                    </p>
                  )}

                  {isCorrect === false && !spellError && (
                    <p className="text-red-600 font-bold mt-2">
                      ❌ Incorrect. The word was: {currentWord.word}
                    </p>
                  )}
                </div>
              )}


              {isCorrect !== null && (
                <button
                  onClick={() => handleNextWord()}
                  className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  Next Word →
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg text-center">
          <div className="flex justify-center items-center space-x-2 text-orange-700">
            <Heart className="h-6 w-6" />
            <span className="text-lg font-semibold">Take your time and do your best!</span>
            <Heart className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpellBeeCompetition;
