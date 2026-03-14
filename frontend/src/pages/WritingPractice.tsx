import React, { useState, useRef, useEffect } from 'react';
import { Pen, Eraser, Undo2, Trash2, Volume2, CheckCircle, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const WritingPractice = () => {
  const { userData } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(10);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [currentLetter, setCurrentLetter] = useState('A');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const [predictedLetter, setPredictedLetter] = useState<string | null>(null);
  
  const PYTHON_API = import.meta.env.VITE_PYTHON_API;
  const API = import.meta.env.VITE_API_URL;

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F59E0B' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (feedbackStatus) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev, imageData]);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || feedbackStatus) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setUndoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const newStack = [...undoStack];
    const lastState = newStack.pop();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
    }

    setUndoStack(newStack);
  };

  const handlePlayWord = () => {
    setIsPlaying(true);
    const speech = new SpeechSynthesisUtterance(currentLetter);
    speech.rate = 0.6;
    speech.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(speech);
  };

  const handleNextLetter = () => {
    setFeedbackStatus(null);
    clearCanvas();
    const nextIndex = (letters.indexOf(currentLetter) + 1) % letters.length;
    setCurrentLetter(letters[nextIndex]);
    setLastEarnedPoints(0);
    setPredictedLetter(null);
  };

  const handleTryAgain = () => {
    setFeedbackStatus(null);
    clearCanvas();
    setPredictedLetter(null);
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageBase64 = canvas.toDataURL("image/png");

    try {
      const verifyResponse = await axios.post(`${PYTHON_API}/writing/predict`, {
        image: imageBase64,
      });

      const predictedLetter = verifyResponse.data.predicted_letter;
      console.log(`AI predicted: ${predictedLetter}, User needs: ${currentLetter}`);

      if (predictedLetter.toUpperCase() === currentLetter.toUpperCase()) {
        const earnedPoints = Math.floor(Math.random() * 15) + 10;
        setLastEarnedPoints(earnedPoints);
        setScore((prev) => prev + earnedPoints);
        setAttempts((prev) => prev + 1);
        setFeedbackStatus('correct');
        setPredictedLetter(null);

        // ✅ ONLY NEW CODE - Submit to backend
        try {
          await axios.post(`${API}/api/writing/submit`, {
            userId: userData?.uid || 'guest',
            score: earnedPoints,
            letter: currentLetter,
          });
          console.log("Writing progress saved successfully");
        } catch (scoreError) {
          console.warn("Could not save writing progress:", scoreError);
        }
        // ✅ END NEW CODE

      } else {
        setPredictedLetter(predictedLetter);
        setFeedbackStatus('incorrect');
      }
    } catch (predictionError) {
      console.error("Error during prediction:", predictionError);
      setPredictedLetter(null);
      setFeedbackStatus('incorrect');
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✍️</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4">
            Writing Practice
          </h1>
          <p className="text-xl text-gray-700">
            Practice writing letters and words with fun colors! 🎨
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-2xl">
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlayWord}
                    disabled={isPlaying || !!feedbackStatus}
                    className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Volume2 className="h-5 w-5" />
                    <span>Hear Letter</span>
                  </button>

                  <div className="bg-white rounded-2xl px-8 py-4 shadow-lg">
                    <p className="text-sm text-gray-600 mb-1">Practice Writing:</p>
                    <p className="text-4xl font-bold text-purple-700">{currentLetter}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl px-6 py-3 text-white shadow-lg">
                  <span className="font-bold text-xl">{score} pts</span>
                </div>
              </div>

              <div className="relative border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white shadow-lg">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />

                {feedbackStatus && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center p-4
                    ${feedbackStatus === 'correct'
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                      : 'bg-gradient-to-br from-red-400 to-red-500'
                    } bg-opacity-95`}
                  >
                    {feedbackStatus === 'correct' ? (
                      <div className="text-center">
                        <CheckCircle className="h-24 w-24 text-white mx-auto mb-4" />
                        <p className="text-4xl font-bold text-white">Great Job!</p>
                        <p className="text-2xl text-white">+{lastEarnedPoints} points</p>
                        <button
                          onClick={handleNextLetter}
                          className="mt-8 bg-white text-purple-700 px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                        >
                          <span>Next Letter</span>
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-4xl font-bold text-white">Not Quite!</p>
                        {predictedLetter && (
                          <p className="text-2xl text-white mt-2">
                            The AI thought you wrote <span className="font-bold">{predictedLetter}</span>.
                          </p>
                        )}
                        <p className="text-2xl text-white">
                          Please try writing <span className="font-bold">{currentLetter}</span> again.
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                          <button
                            onClick={handleTryAgain}
                            className="bg-white text-red-700 px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                          >
                            <Undo2 className="h-5 w-5" />
                            <span>Try Again</span>
                          </button>
                          <button
                            onClick={handleNextLetter}
                            className="bg-white text-purple-700 px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                          >
                            <span>Next Letter</span>
                            <ArrowRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setTool('pen')}
                    disabled={!!feedbackStatus}
                    aria-label="Use Pen"
                    className={`p-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg ${tool === 'pen'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                      } ${!!feedbackStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Pen className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setTool('eraser')}
                    disabled={!!feedbackStatus}
                    aria-label="Use Eraser"
                    className={`p-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg ${tool === 'eraser'
                        ? 'bg-gradient-to-r from-red-400 to-red-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                      } ${!!feedbackStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Eraser className="h-5 w-5" />
                  </button>

                  <button
                    onClick={handleUndo}
                    disabled={!!feedbackStatus || undoStack.length === 0}
                    aria-label="Undo"
                    className={`p-3 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-all duration-300 shadow-lg ${!!feedbackStatus || undoStack.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Undo2 className="h-5 w-5" />
                  </button>

                  <button
                    onClick={clearCanvas}
                    disabled={!!feedbackStatus}
                    aria-label="Clear Canvas"
                    className={`p-3 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-all duration-300 shadow-lg ${!!feedbackStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {!feedbackStatus && (
                  <button
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center space-x-2">
                <span>🎨</span>
                <span>Colors</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    disabled={!!feedbackStatus}
                    aria-label={`Select color ${c.name}`}
                    className={`h-16 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${color === c.value ? 'ring-4 ring-purple-400 ring-offset-2' : ''
                      } ${!!feedbackStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center space-x-2">
                <span>📏</span>
                <span>Pen Size</span>
              </h3>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                disabled={!!feedbackStatus}
                className="w-full h-3 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <div className="mt-4 flex items-center justify-center">
                <div
                  className="rounded-full bg-gray-800"
                  style={{ width: `${lineWidth * 2}px`, height: `${lineWidth * 2}px` }}
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-green-700 mb-4">Your Progress</h3>
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                  <p className="text-gray-600 text-sm font-semibold">Total Score</p>
                  <p className="text-3xl font-bold text-purple-600">{score}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                  <p className="text-gray-600 text-sm font-semibold">Letters Practiced</p>
                  <p className="text-3xl font-bold text-green-600">{attempts}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                  <p className="text-gray-600 text-sm font-semibold">Stars Earned</p>
                  <p className="text-3xl font-bold text-yellow-500">
                    {Math.floor(score / 50)}⭐
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg text-center">
          <div className="flex justify-center items-center space-x-2 text-orange-700">
            <Heart className="h-6 w-6" />
            <span className="text-lg font-semibold">Practice makes perfect! Keep going!</span>
            <Heart className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingPractice;
