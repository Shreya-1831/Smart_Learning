import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, RotateCcw, Trophy, Grid3x3, BarChart3 } from 'lucide-react';
import axios from "axios";
import { useAuth } from "../contexts/AuthContext"; // ✅ ADD THIS


// This is the Node.js server URL
const API_URL = "http://localhost:4000/api/wordgame/botmove";
const SAVE_API_URL = "http://localhost:4000/api/wordgame/save"; // ✅ ADD THIS


interface PlacedWord {
  sender: 'user' | 'bot';
  word: string;
  points: number;
}


const WordBuildingGame = () => {
  const { userData } = useAuth(); // ✅ ADD THIS
  const [gameStarted, setGameStarted] = useState(false);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [userInput, setUserInput] = useState('');
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastBotWord, setLastBotWord] = useState('');
  const [gameMessage, setGameMessage] = useState(''); // For errors and game over
  const wordBoardRef = useRef<HTMLDivElement>(null);


  const userWords = placedWords.filter(w => w.sender === 'user');
  const botWords = placedWords.filter(w => w.sender === 'bot');


  useEffect(() => {
    // Scroll to the bottom of the word board
    if (wordBoardRef.current) {
      wordBoardRef.current.scrollTop = wordBoardRef.current.scrollHeight;
    }
  }, [placedWords]);

  // ✅ NEW: Save game to database when game ends
  const saveGameToDatabase = async (finalScore: number) => {
    if (!userData?.uid) {
      console.warn('No user ID available to save game');
      return;
    }

    try {
      console.log(`💾 Saving word game score: ${finalScore} for user ${userData.uid}`);
      await axios.post(SAVE_API_URL, {
        userId: userData.uid,
        score: finalScore
      });
      console.log('✅ Word game saved to database!');
    } catch (error) {
      console.error('❌ Error saving word game:', error);
    }
  };


  const startGame = async () => {
    setPlacedWords([]);
    setPlayerScore(0);
    setBotScore(0);
    setUserInput('');
    setGameOver(false);
    setIsBotThinking(true);
    setGameStarted(true);
    setGameMessage('');


    try {
      // Get the first word from the bot by sending "START"
      const res = await axios.post(API_URL, { 
        word: "START",
        usedWords: [] // Send empty list on start
      });
      const { word, points } = res.data;


      setPlacedWords([{ sender: 'bot', word, points }]);
      setBotScore(points);
      setLastBotWord(word);
    } catch (err) {
      console.error("Error starting game:", err);
      setGameMessage('Error starting game. Please check the server.');
    } finally {
      setIsBotThinking(false);
    }
  };


  const handleSendWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const userWord = userInput.trim().toUpperCase();
    if (!userWord || userWord.length < 2 || isBotThinking || gameOver) return;


    // Check 1: Does it follow the chain?
    const lastLetter = lastBotWord.slice(-1);
    if (userWord[0] !== lastLetter) {
      setGameMessage(`Your word must start with "${lastLetter}"!`);
      return;
    }


    // Check 2: Has it been used?
    if (placedWords.some(w => w.word === userWord)) {
      setGameMessage(`"${userWord}" has already been played! Game Over!`);
      setGameOver(true);
      // ✅ SAVE GAME ON LOSS (repeated word)
      await saveGameToDatabase(playerScore);
      return;
    }


    // --- User's Turn is Valid ---
    setGameMessage('');
    setIsBotThinking(true);
    setUserInput('');


    const userPoints = userWord.length * 2;
    const userWordEntry: PlacedWord = { sender: 'user', word: userWord, points: userPoints };

    // Create the new list of placed words *before* the API call
    const newPlacedWords = [...placedWords, userWordEntry];
    setPlacedWords(newPlacedWords);

    const newPlayerScore = playerScore + userPoints;
    setPlayerScore(newPlayerScore);


    // Get ALL words played so far to send to the bot
    const allUsedWords = newPlacedWords.map(w => w.word);


    try {
      // Send user's word AND the list of used words to bot
      const res = await axios.post(API_URL, { 
        word: userWord,
        usedWords: allUsedWords
      });
      const { word: botWord, points: botPoints } = res.data;


      // Check 3: Bot's response
      if (botWord === "EXIT" || !botWord) {
        setGameMessage("I can't think of a word... You win!");
        setGameOver(true);
        // ✅ SAVE GAME ON WIN (bot gives up)
        await saveGameToDatabase(newPlayerScore);
      } else if (placedWords.some(w => w.word === botWord)) {
        setGameMessage(`Bot repeated a word ("${botWord}")! You win!`);
        setGameOver(true);
        // ✅ SAVE GAME ON WIN (bot repeated)
        await saveGameToDatabase(newPlayerScore);
      } else {
        // Bot plays a valid word
        const botWordEntry: PlacedWord = { sender: 'bot', word: botWord, points: botPoints };
        setPlacedWords(prev => [...prev, botWordEntry]); // Add bot's word
        setBotScore(prev => prev + botPoints);
        setLastBotWord(botWord);
      }
    } catch (err) {
      console.error("Error calling bot:", err);
      setGameMessage('I had an error. You win!');
      setGameOver(true);
      // ✅ SAVE GAME ON WIN (bot error)
      await saveGameToDatabase(newPlayerScore);
    } finally {
      setIsBotThinking(false);
    }
  };


  // --- Render Start Screen ---
  if (!gameStarted) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full px-4">
          <div className="rounded-3xl p-8 shadow-2xl bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">⛓️</div>
              <h1 className="text-3xl font-bold text-purple-700 mb-2">Word Chain Game</h1>
              <p className="text-gray-600">Compete with our AI bot!</p>
            </div>
            <div className="space-y-4 text-left max-w-md mx-auto mb-8">
              <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                <span className="text-3xl">🤖</span>
                <p className="text-gray-700 font-semibold">The bot starts with a random word (e.g., "DOG").</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                <span className="text-3xl">👤</span>
                <p className="text-gray-700 font-semibold">Your word must start with the bot's last letter (e.g., "G" {'->'} "GAP").</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-lg flex items-start space-x-3">
                <span className="text-3xl">🚫</span>
                <p className="text-gray-700 font-semibold">If anyone repeats a word, the game is over!</p>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full py-4 px-8 rounded-xl text-xl font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-gradient-to-r from-blue-400 to-purple-500"
            >
              Start Game! 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }


  // --- Render Main Game Screen (matching your image) ---
  return (
    <div className="min-h-screen py-12" style={{ background: 'linear-gradient(to bottom right, #f3e8ff, #f0f9ff)' }}>
      <div className="max-w-7xl mx-auto px-4">

        {/* Top Score Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Your Score */}
          <div className="rounded-2xl p-6 shadow-xl text-center bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]">
            <User className="h-8 w-8 mx-auto mb-2 text-white" />
            <h3 className="text-lg font-semibold mb-1 text-white">Your Score</h3>
            <p className="text-4xl font-bold text-white">{playerScore}</p>
            <p className="text-sm text-white opacity-80">{userWords.length} moves</p>
          </div>


          {/* VS Block */}
          <div className="bg-white rounded-2xl p-6 shadow-xl text-center flex items-center justify-center">
            <div>
              <div className="text-4xl mb-2">⚔️</div>
              <p className="text-2xl font-bold text-purple-700">VS</p>
            </div>
          </div>


          {/* Bot Score */}
          <div className="rounded-2xl p-6 shadow-xl text-center bg-gradient-to-br from-orange-400 to-orange-500 text-white">
            <Bot className="h-8 w-8 mx-auto mb-2 text-white" />
            <h3 className="text-lg font-semibold mb-1 text-white">Bot Score</h3>
            <p className="text-4xl font-bold text-white">{botScore}</p>
            <p className="text-sm text-white opacity-80">AI Opponent</p>
          </div>
        </div>


        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Word Board + Input */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-purple-700 flex items-center space-x-2 mb-6">
                <Grid3x3 className="h-6 w-6" />
                <span>Word Board</span>
              </h2>


              {/* Word Board */}
              <div 
                ref={wordBoardRef} 
                className="bg-purple-50 rounded-2xl p-6 mb-6 min-h-[250px] max-h-[250px] overflow-y-auto shadow-inner"
              >
                <div className="flex flex-wrap gap-3">
                  {placedWords.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-xl px-5 py-3 shadow-lg transform hover:scale-105 transition-all duration-300 ${
                        item.sender === 'user'
                          ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                          : 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                      }`}
                    >
                      <p className="text-xl font-bold">{item.word}</p>
                    </div>
                  ))}
                </div>
              </div>


              {/* Input Area */}
              <form onSubmit={handleSendWord}>
                {/* Message Area */}
                <div className="h-10 mb-4 text-center">
                  {isBotThinking && (
                    <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full font-semibold animate-pulse shadow-lg inline-block">
                      🤖 Bot is thinking...
                    </div>
                  )}
                  {gameMessage && !gameOver && (
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold shadow-lg inline-block">
                      {gameMessage}
                    </div>
                  )}
                  {gameOver && (
                     <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold shadow-lg inline-block">
                      {gameMessage} 💾 Score saved!
                    </div>
                  )}
                </div>


                {/* Text Input and Button */}
                {!gameOver ? (
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={isBotThinking ? "Wait for bot..." : `Word starting with "${lastBotWord.slice(-1)}"`}
                      disabled={isBotThinking || gameOver}
                      className="flex-1 w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-lg"
                    />
                    <button
                      type="submit"
                      disabled={isBotThinking || gameOver}
                      className="px-6 py-4 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-gradient-to-r from-green-400 to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-6 w-6" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startGame}
                    className="w-full py-4 px-8 rounded-xl text-xl font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-gradient-to-r from-blue-400 to-purple-500"
                  >
                    <RotateCcw className="h-5 w-5 inline-block mr-2" />
                    Play Again
                  </button>
                )}
              </form>
            </div>
          </div>


          {/* Right Column: Your Words + Game Stats */}
          <div className="space-y-6">
            {/* Your Words */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center space-x-2">
                <Trophy className="h-6 w-6" />
                <span>Your Words ({userWords.length})</span>
              </h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {userWords.length > 0 ? (
                  userWords.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <span className="font-bold text-purple-700">{item.word}</span>
                      <span className="text-green-600 font-semibold">+{item.points}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Play a word!</p>
                )}
              </div>
            </div>


            {/* Bot Words */}
             <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-orange-600 mb-4 flex items-center space-x-2">
                <Bot className="h-6 w-6" />
                <span>Bot Words ({botWords.length})</span>
              </h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {botWords.length > 0 ? (
                  botWords.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <span className="font-bold text-orange-700">{item.word}</span>
                      <span className="text-green-600 font-semibold">+{item.points}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Waiting for bot...</p>
                )}
              </div>
            </div>


            {/* Game Stats */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center space-x-2">
                <BarChart3 className="h-6 w-6" />
                <span>Game Stats</span>
              </h3>
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-2xl p-4 shadow-sm">
                  <p className="text-gray-600 text-sm font-semibold">Total Words Built</p>
                  <p className="text-3xl font-bold text-purple-600">{placedWords.length}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 shadow-sm">
                  <p className="text-gray-600 text-sm font-semibold">Total Letters Used</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {placedWords.reduce((sum, item) => sum + item.word.length, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default WordBuildingGame;
