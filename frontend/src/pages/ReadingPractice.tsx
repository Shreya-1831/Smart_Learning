import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from "../contexts/AuthContext";
// Import ALL necessary icons
import { Mic, MicOff, Volume2, Star, ChevronRight, RotateCcw, BookOpen, Heart, PartyPopper } from 'lucide-react';

// --- NEW TYPE ---
// Type for the word-by-word feedback
interface FeedbackWord {
  word: string;
  status: 'correct' | 'incorrect' | 'missed';
}

interface Passage {
  id: number;
  title: string;
  text: string;
  difficulty: string;
  points: number;
}

// --- (UPDATED) PRONUNCIATION COMPONENT ---
// Helper component to render the color-coded feedback
const PronunciationFeedback = ({ feedback }: { feedback: FeedbackWord[] }) => {
  if (!feedback || feedback.length === 0) return null;

  const getWordClass = (status: string) => {
    switch (status) {
      case 'correct':
        // Correct words
        return 'text-green-600 font-bold';
      case 'incorrect':
        // Incorrect words
        return 'text-red-600 line-through decoration-2';
      case 'missed':
        // Missed words
        return 'text-gray-400 underline decoration-dotted';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="bg-white/70 rounded-2xl p-6 shadow-inner">
      <h4 className="text-lg font-bold text-gray-700 mb-3">Your Pronunciation:</h4>
      
      {/* --- THIS IS THE FIX --- */}
      {/* We use flex-wrap to make the words wrap to the next line */}
      <div className="flex flex-wrap text-2xl leading-relaxed">
        {feedback.map((item, index) => (
          // Added mb-2 for vertical spacing when words wrap
          <span 
            key={`${item.word}-${index}`} 
            className={`mr-2 mb-2 transition-all ${getWordClass(item.status)}`}
          >
            {item.word}
          </span>
        ))}
      </div>
      {/* --- END OF FIX --- */}

    </div>
  );
};


const ReadingPractice = () => {
  // --- FIX 1: 'useAuth' hook moved inside the component ---
  const { userData } = useAuth();

  // --- STATE AND REFS ---
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0); // <-- RENAMED from 'score'
  const [readingTime, setReadingTime] = useState(0);
  const [passages, setPassages] = useState<Passage[]>([
    // Initial passages (unchanged)
    {
      id: 1,
      title: 'The Happy Cat',
      text: 'There was a happy cat named Whiskers. Whiskers loved to play in the sun. Every day, Whiskers would chase butterflies in the garden.',
      difficulty: 'Easy',
      points: 20,
    },
    {
      id: 2,
      title: 'My Best Friend',
      text: 'My best friend is Sam. We play together every day after school. Sam makes me laugh and we share our toys. Having a good friend is wonderful!',
      difficulty: 'Easy',
      points: 25,
    },
    {
      id: 3,
      title: 'The Magic Tree',
      text: 'In the middle of the forest stood a magical tree. Its leaves sparkled like diamonds in the moonlight. Children from nearby villages would visit the tree to make special wishes.',
      difficulty: 'Medium',
      points: 30,
    },
  ]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // --- NEW STATES for Pronunciation Feedback ---
  const [pronunciationScore, setPronunciationScore] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackWord[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState(""); // For "Great job!" etc.

  const currentPassage = passages[currentPassageIndex];
  const GOAL_COUNT = 5; 

  // --- Audio Recording Refs (Unchanged) ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopRecordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Play Passage (Unchanged) ---
  const handlePlayPassage = () => {
    setIsPlaying(true);
    const speech = new SpeechSynthesisUtterance(currentPassage.text);
    speech.rate = 0.8;
    speech.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(speech);
  };

  // --- (UPDATED) Fetch new passage from Node.js backend ---
  const fetchNewPassage = async () => {
    try {
      // --- UPDATED: Pointing back to Node.js server ---
      const res = await axios.get('http://localhost:4000/api/reading/passage'); 
      
      // --- FIX 2: Add fallbacks to prevent undefined fields ---
      const newPassage: Passage = {
        id: Date.now(),
        title: res.data.title || "A New Story",
        text: res.data.text || "This is a new story. Read it aloud!",
        difficulty: res.data.difficulty || "Easy",
        points: 20 + Math.floor(Math.random() * 20),
      };

      setPassages((prev) => {
        const newList = [...prev, newPassage];
        setCurrentPassageIndex(newList.length - 1); // Go to the new passage
        return newList;
      });

      setShowFeedback(false); // Reset feedback for the new passage
      setReadingTime(0);
      setFeedback([]); // Clear old feedback
      setPronunciationScore(0); // Clear old score
    } catch (err) {
      console.error('Error fetching new passage:', err);
      // --- FIX 3: Add fallback for network errors ---
      const newPassage: Passage = {
        id: Date.now(),
        title: "Error Story",
        text: "Oops! We couldn't get a new story. Please try again.",
        difficulty: "Easy",
        points: 0,
      };
      setPassages((prev) => {
        const newList = [...prev, newPassage];
        setCurrentPassageIndex(newList.length - 1); 
        return newList;
      });
    }
  };

  // --- Stop Recording Helper (Unchanged) ---
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (stopRecordTimeoutRef.current) clearTimeout(stopRecordTimeoutRef.current);
    setIsRecording(false);
  };

  // --- (UPDATED) Process Audio and send to Node.js backend ---
  const processAudioRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn('No audio data recorded.');
      setShowFeedback(true);
      setTotalPoints((prev) => prev + (currentPassage?.points || 10));
      return;
    }
    if (!currentPassage) return; // Safety check

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      if (!base64Audio) return console.error('Failed to convert audio to base64');

      try {
        // --- UPDATED PAYLOAD ---
        const payload = {
          userId: userData?.uid || 'guest', // Use userData, with a fallback
          audioBase64: base64Audio,
          passageText: currentPassage.text // <-- SENDING THE TEXT
        };

        // --- UPDATED ENDPOINT: Pointing back to Node.js server ---
        const res = await axios.post('http://localhost:4000/api/reading/analyze', payload); 
        
        // --- UPDATED RESPONSE HANDLING ---
        const { 
          sentiment, 
          transcribed, 
          adjusted_passage, 
          score: newPronunciationScore, // <-- This is the new score
          feedback: newFeedback         // <-- This is the new feedback array
        } = res.data;

        // --- SET NEW STATE ---
        setPronunciationScore(newPronunciationScore);
        setFeedback(newFeedback || []); // Ensure it's an array
        setFeedbackMessage(adjusted_passage || "You did a great job!");

        setShowFeedback(true);
        setTotalPoints((prev) => prev + currentPassage.points); // Add points

        console.log('Sentiment:', sentiment);
        console.log('Transcribed:', transcribed);
        console.log('Pronunciation Score:', newPronunciationScore);
        console.log('Feedback:', newFeedback);

      } catch (err) {
        console.error('Error analyzing audio:', err);
        setShowFeedback(true);
        setTotalPoints((prev) => prev + currentPassage.points);
        setFeedbackMessage("Oops! We had a little trouble. Let's try the next one!");
      }
    };
  };

  // --- Record / Stop (Unchanged) ---
  const handleRecord = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          processAudioRecording();
          stream.getTracks().forEach((t) => t.stop());
        };

        recorder.start();
        setIsRecording(true);
        setReadingTime(0);

        timerIntervalRef.current = setInterval(() => {
          setReadingTime((prev) => prev + 1);
        }, 1000);

        stopRecordTimeoutRef.current = setTimeout(() => {
            console.log('60-second limit reached. Stopping recording.');
            stopRecording();
        }, 60000); 
      } catch (err) {
        console.error('Microphone access denied:', err);
        alert('Could not access microphone. Please allow permission.');
      }
    } else {
      stopRecording();
    }
  };

  // --- (UPDATED) Next passage logic ---
  const handleNext = () => {
    setShowFeedback(false);
    setReadingTime(0);
    // --- RESET FEEDBACK ---
    setFeedback([]);
    setPronunciationScore(0);
    setFeedbackMessage("");
    // ---

    const nextIndex = currentPassageIndex + 1;
    
    if (passages.length >= GOAL_COUNT && currentPassageIndex === GOAL_COUNT - 1) {
      setIsSessionComplete(true);
    } else if (nextIndex < passages.length) { 
      setCurrentPassageIndex(nextIndex);
    } else if (passages.length < GOAL_COUNT) {
      fetchNewPassage(); 
    } else {
      setIsSessionComplete(true);
    }
  };

  // --- (UPDATED) Restart logic ---
  const handleRestart = () => {
    setCurrentPassageIndex(0);
    setTotalPoints(0); // <-- Use renamed state
    setShowFeedback(false);
    setReadingTime(0);
    setIsSessionComplete(false);
    
    // --- RESET FEEDBACK ---
    setFeedback([]);
    setPronunciationScore(0);
    setFeedbackMessage("");

    // Reset passages to the initial 3 (Unchanged)
    setPassages([
      {
        id: 1,
        title: 'The Happy Cat',
        text: 'There was a happy cat named Whiskers. Whiskers loved to play in the sun. Every day, Whiskers would chase butterflies in the garden.',
        difficulty: 'Easy',
        points: 20,
      },
      {
        id: 2,
        title: 'My Best Friend',
        text: 'My best friend is Sam. We play together every day after school. Sam makes me laugh and we share our toys. Having a good friend is wonderful!',
        difficulty: 'Easy',
        points: 25,
      },
      {
        id: 3,
        title: 'The Magic Tree',
        text: 'In the middle of the forest stood a magical tree. Its leaves sparkled like diamonds in the moonlight. Children from nearby villages would visit the tree to make special wishes.',
        difficulty: 'Medium',
        points: 30,
      },
    ]);
  };

  // --- Sentiment Color Helper (Unchanged) ---
  const sentimentColors = {
    positive: { bg: 'from-green-50 to-emerald-50', text: 'text-green-700', icon: '😊' },
    neutral: { bg: 'from-blue-50 to-cyan-50', text: 'text-blue-700', icon: '😌' },
    exciting: { bg: 'from-orange-50 to-yellow-50', text: 'text-orange-700', icon: '🤩' },
  };

  const passageSentiment =
    currentPassage?.difficulty === 'Easy'
      ? 'positive'
      : currentPassage?.difficulty === 'Medium'
      ? 'exciting'
      : 'neutral';
  const sentiment = sentimentColors[passageSentiment];

  // --- (UPDATED) Session Complete Component ---
  const SessionCompleteDisplay = () => (
    <div className="lg:col-span-3"> 
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-8xl mb-6 animate-bounce">
              <PartyPopper className="inline-block" />
            </div>
            <h2 className="text-4xl font-bold text-green-700 mb-4">
              Great Job!
            </h2>
            <p className="text-2xl text-gray-700 mb-8">
              You completed all {GOAL_COUNT} stories!
            </p>
            
            <div className="max-w-sm mx-auto space-y-4 mb-8">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Total Score</span>
                        <span className="text-2xl">🏆</span>
                    </div>
                    <p className="text-3xl font-bold">{totalPoints}</p> {/* <-- Use renamed state */}
                </div>
                <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Stars Earned</span>
                        <span className="text-2xl">⭐</span>
                    </div>
                    <p className="text-3xl font-bold">{Math.floor(totalPoints / 30)}</p> {/* <-- Use renamed state */}
                </div>
            </div>

            <button
                onClick={handleRestart}
                className="w-full max-w-xs mx-auto bg-white text-purple-600 px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
            >
                <RotateCcw className="h-5 w-5" />
                <span>Play Again</span>
            </button>
        </div>
    </div>
  );

  // --- JSX (with updates) ---
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header (Unchanged) */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-4">
            Reading Practice
          </h1>
          <p className="text-xl text-gray-700">
            Read aloud and improve your reading skills! 🎤
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isSessionComplete ? (
              <SessionCompleteDisplay /> 
          ) : !currentPassage ? (
            <div className="lg:col-span-3 text-center p-8">Loading...</div>
          ) : (
            <>
              {/* Main Content Area */}
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-2xl mb-6">
                  {/* Passage Header (Unchanged) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex items-center space-x-4">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {currentPassage.title}
                        </h2>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          currentPassage.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                          currentPassage.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {currentPassage.difficulty}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handlePlayPassage}
                      disabled={isPlaying}
                      className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Volume2 className="h-5 w-5" />
                      <span>Listen</span>
                    </button>
                  </div>

                  {/* --- (UPDATED) Passage Text Box --- */}
                  {/* This now conditionally shows the feedback component */}
                  <div className={`bg-gradient-to-br ${sentiment.bg} rounded-2xl p-8 mb-6 border-2 border-gray-100 shadow-lg`}>
                    {showFeedback && feedback.length > 0 ? (
                      <PronunciationFeedback feedback={feedback} />
                    ) : (
                      <p className="text-2xl leading-relaxed text-gray-800 font-medium">
                        {currentPassage.text}
                      </p>
                    )}
                  </div>

                  {/* Recording/Feedback Section */}
                  <div className="text-center">
                    {!showFeedback ? (
                      // Recording UI (Unchanged)
                      <div>
                        <p className="text-lg font-semibold text-gray-700 mb-6">
                          {isRecording ? 'Reading... Speak clearly!' : 'Tap the microphone to start reading aloud'}
                        </p>
                        <button
                          onClick={handleRecord}
                          className={`w-32 h-32 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center mx-auto mb-6 ${
                            isRecording
                              ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse'
                              : 'bg-gradient-to-br from-green-400 to-emerald-500'
                          }`}
                        >
                          {isRecording ? (
                            <MicOff className="h-16 w-16 text-white" />
                          ) : (
                            <Mic className="h-16 w-16 text-white" />
                          )}
                        </button>
                        {isRecording && (
                          <div className="bg-white rounded-2xl p-4 inline-block shadow-lg">
                            <p className="text-2xl font-bold text-gray-800">{readingTime}s</p>
                            <p className="text-sm text-gray-600">Reading Time</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // --- (UPDATED) Feedback UI ---
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 shadow-lg">
                        <div className="text-8xl mb-6 animate-bounce">
                          <Star className="inline-block text-yellow-400" />
                        </div> 
                        <h3 className="text-3xl font-bold text-green-700 mb-6">
                          Excellent Reading!
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-white rounded-2xl p-4 shadow-lg">
                            <p className="text-sm text-gray-600 font-semibold">Points Earned</p>
                            <p className="text-2xl font-bold text-purple-600">+{currentPassage.points}</p>
                          </div>
                          <div className="bg-white rounded-2xl p-4 shadow-lg">
                            <p className="text-sm text-gray-600 font-semibold">Reading Time</p>
                            <p className="text-2xl font-bold text-blue-600">{readingTime}s</p>
                          </div>
                          {/* --- UPDATED: Shows Pronunciation Score --- */}
                          <div className="bg-white rounded-2xl p-4 shadow-lg">
                            <p className="text-sm text-gray-600 font-semibold">Pronunciation</p>
                            <p className="text-2xl font-bold text-green-600">{pronunciationScore}%</p>
                          </div>
                        </div>
                        {/* --- UPDATED: Shows Teacher's Note --- */}
                        <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg">
                          <p className="text-sm text-gray-600 mb-2 font-semibold">Teacher's Note</p>
                          <p className={`text-lg font-bold ${sentiment.text}`}> 
                            {feedbackMessage.split('\n\n').map((paragraph, i) => <span key={i} className="block mb-2">{paragraph.replace(/\*\*/g, '')}</span>)}
                          </p>
                        </div>
                        <button
                          onClick={handleNext}
                          className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
                        >
                          <span>Next Story</span>
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reading Tips Section (Unchanged) */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-orange-700 mb-3 flex items-center space-x-2">
                      <span>💡</span>
                      <span>Reading Tips</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 shadow flex items-center space-x-2">
                        <span className="text-xl">✓</span>
                        <span className="text-gray-700 font-semibold">Read slowly and clearly</span>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow flex items-center space-x-2">
                        <span className="text-xl">✓</span>
                        <span className="text-gray-700 font-semibold">Watch punctuation</span>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow flex items-center space-x-2">
                        <span className="text-xl">✓</span>
                        <span className="text-gray-700 font-semibold">Express emotions</span>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow flex items-center space-x-2">
                        <span className="text-xl">✓</span>
                        <span className="text-gray-700 font-semibold">Have fun!</span>
                      </div>
                    </div>
                  </div>
              </div>

              {/* --- (UPDATED) Sidebar Area --- */}
              <div className="space-y-6">
                {/* Progress Box */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-purple-700 mb-4">Your Progress</h3>
                  <div className="space-y-4">
                    {/* Total Score */}
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Total Score</span>
                        <span className="text-2xl">🏆</span>
                      </div>
                      <p className="text-3xl font-bold">{totalPoints}</p> {/* <-- Use renamed state */}
                    </div>
                    {/* Stories Read */}
                    <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl p-4 text-white shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Stories Read</span>
                        <span className="text-2xl">📚</span>
                      </div>
                      <p className="text-3xl font-bold">{currentPassageIndex + 1}/{GOAL_COUNT}</p> 
                    </div>
                    {/* Stars Earned */}
                    <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-4 text-white shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Stars Earned</span>
                        <span className="text-2xl">⭐</span>
                      </div>
                      <p className="text-3xl font-bold">{Math.floor(totalPoints / 30)}</p> {/* <-- Use renamed state */}
                    </div>
                  </div>
                </div>

                {/* Daily Goal Box (Unchanged) */}
                <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl p-6 shadow-2xl text-white text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-xl font-bold mb-2">Daily Goal</h3>
                  <p className="mb-4 text-sm opacity-90">Read {GOAL_COUNT} stories today!</p>
                  <div className="bg-white/20 rounded-full h-4 overflow-hidden mb-2">
                    <div
                      className="bg-white h-full transition-all duration-500"
                      style={{ width: `${((currentPassageIndex + 1) / GOAL_COUNT) * 100}%` }} 
                    />
                  </div>
                  <p className="text-sm opacity-90">{currentPassageIndex + 1}/{GOAL_COUNT} completed</p>
                </div>

                {/* Restart Button (Unchanged) */}
                <button
                  onClick={handleRestart}
                  className="w-full bg-white text-purple-600 px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Start Over</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Message (Unchanged) */}
        <div className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 shadow-lg text-center">
          <div className="flex justify-center items-center space-x-2 text-purple-700">
            <Heart className="h-6 w-6" />
            <span className="text-lg font-semibold">You're doing amazing! Keep reading!</span>
            <Heart className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingPractice;