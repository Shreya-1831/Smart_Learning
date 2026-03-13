import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart } from 'lucide-react';

const MentalAgeTest = () => {
  const navigate = useNavigate();
  const { updateUserData, userData } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  const questions = [
    {
      id: 1,
      question: "Which word rhymes with 'cat'?",
      options: ["dog", "bat", "fish", "bird"],
      correct: "bat",
      mascot: "🐱"
    },
    {
      id: 2,
      question: "What sound does the letter 'B' make?",
      options: ["buh", "cuh", "duh", "fuh"],
      correct: "buh",
      mascot: "🅱️"
    },
    {
      id: 3,
      question: "How many syllables are in 'butterfly'?",
      options: ["2", "3", "4", "5"],
      correct: "3",
      mascot: "🦋"
    },
    {
      id: 4,
      question: "Which word starts with the same sound as 'sun'?",
      options: ["moon", "star", "soap", "tree"],
      correct: "soap",
      mascot: "☀️"
    },
    {
      id: 5,
      question: "What comes next in this pattern: A, B, C, ?",
      options: ["X", "D", "Z", "B"],
      correct: "D",
      mascot: "🔤"
    }
  ];

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    const newScore = answer === questions[currentQuestion].correct ? score + 1 : score;
    if (answer === questions[currentQuestion].correct) {
      setScore(newScore);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setScore(newScore);
      setIsComplete(true);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const percentage = (score / questions.length) * 100;
      let mentalAge = 7;

      if (percentage >= 80) {
        mentalAge = 10;
      } else if (percentage >= 60) {
        mentalAge = 9;
      } else if (percentage >= 40) {
        mentalAge = 8;
      }

      await updateUserData({ mentalAge, firstLogin: false });
      navigate('/student-dashboard');
    } catch (error) {
      console.error('Error updating user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEncouragement = () => {
    const encouragements = [
      "You're doing great! 🌟",
      "Keep it up, superstar! ✨",
      "Awesome job! 🎉",
      "You're amazing! 🦄",
      "Fantastic work! 🚀"
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  if (isComplete) {
    const percentage = (score / questions.length) * 100;
    let level = "Beginner Explorer";
    let levelIcon = "🌱";
    let message = "Every expert was once a beginner! You're on a wonderful learning journey!";

    if (percentage >= 80) {
      level = "Reading Wizard";
      levelIcon = "🧙‍♂️";
      message = "Wow! You're a reading superstar! Your skills are truly magical!";
    } else if (percentage >= 60) {
      level = "Learning Hero";
      levelIcon = "🦸‍♀️";
      message = "Great job! You're a learning hero with awesome potential!";
    } else if (percentage >= 40) {
      level = "Growing Scholar";
      levelIcon = "📚";
      message = "You're learning so much! Every day you're getting better and better!";
    }

    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 text-center">
          
          {/* Celebration Animation */}
          <div className="mb-8">
            <div className="text-9xl mb-4 animate-bounce">{levelIcon}</div>
            <div className="text-6xl mb-4">🎉</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-12 shadow-2xl">
            <h1 className="text-4xl font-bold text-orange-700 mb-4">
              Congratulations, {level}!
            </h1>
            
            <div className="text-6xl mb-6">🏆</div>
            
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              {message}
            </p>

            <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
              <h3 className="text-2xl font-bold text-purple-700 mb-4">Your Results</h3>
              <div className="flex justify-center items-center space-x-4 mb-4">
                <span className="text-3xl">🎯</span>
                <span className="text-3xl font-bold text-green-600">{score}/{questions.length}</span>
                <span className="text-3xl">⭐</span>
              </div>
              <p className="text-lg text-gray-600">
                You got {percentage}% correct! Every answer helps us understand how to make learning perfect for you!
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="block w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-4 px-8 rounded-2xl text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Start My Learning Adventure! 🚀'}
              </button>

              <button
                onClick={() => {
                  setCurrentQuestion(0);
                  setAnswers([]);
                  setScore(0);
                  setIsComplete(false);
                }}
                disabled={loading}
                className="block w-full bg-gradient-to-r from-purple-400 to-pink-500 text-white py-3 px-6 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try Again 🔄
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4 animate-bounce">🧠</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Fun Learning Assessment
          </h1>
          <p className="text-xl text-purple-700 mb-8">
            Let's play some games to see how we can make learning perfect for you!
          </p>
          
          {/* Progress Bar */}
          <div className="bg-white rounded-full p-2 shadow-lg mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-purple-600">Question {currentQuestion + 1} of {questions.length}</span>
              <span className="text-sm font-semibold text-green-600">
                {Math.round(((currentQuestion) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-2xl">
          
          {/* Mascot */}
          <div className="text-center mb-8">
            <div className="text-8xl mb-4 animate-pulse">
              {questions[currentQuestion].mascot}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg inline-block">
              <p className="text-lg text-purple-600 font-semibold">
                {getEncouragement()}
              </p>
            </div>
          </div>

          {/* Question */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-purple-700 mb-6">
              {questions[currentQuestion].question}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className="bg-white hover:bg-gradient-to-r hover:from-green-400 hover:to-blue-500 hover:text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-xl font-semibold text-gray-700 border-2 border-transparent hover:border-white"
              >
                {option}
              </button>
            ))}
          </div>

          {/* Encouragement */}
          <div className="text-center mt-10">
            <div className="flex justify-center items-center space-x-2 text-purple-600">
              <Heart className="h-6 w-6" />
              <span className="text-lg font-semibold">Take your time and choose your best answer!</span>
              <Heart className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Bottom Encouragement */}
        <div className="text-center mt-8">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg">
            <p className="text-lg text-orange-700 font-semibold">
              🌟 Remember: There are no wrong answers, only learning opportunities! 🌟
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalAgeTest;