import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const EmotionalFeedback = () => {
  const { userData } = useAuth(); // Changed from { user }
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [weeklyMoods, setWeeklyMoods] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const API = import.meta.env.VITE_API_URL;
  
  // ... rest of the moods, encouragements, and activities arrays stay the same

  const moods = [
    { id: 'amazing', emoji: '😍', label: 'Amazing!', color: 'from-green-400 to-emerald-500', message: 'You\'re feeling fantastic! That\'s wonderful! Keep up that positive energy!' },
    { id: 'happy', emoji: '😊', label: 'Happy', color: 'from-blue-400 to-cyan-500', message: 'I\'m so glad you\'re feeling happy! Happiness makes learning even more fun!' },
    { id: 'okay', emoji: '😐', label: 'Okay', color: 'from-yellow-400 to-orange-400', message: 'It\'s okay to feel just okay sometimes. Let\'s find something fun to boost your mood!' },
    { id: 'sad', emoji: '😢', label: 'Sad', color: 'from-purple-400 to-indigo-500', message: 'I\'m here for you when you\'re feeling sad. Remember, every feeling is okay!' },
    { id: 'frustrated', emoji: '😤', label: 'Frustrated', color: 'from-red-400 to-pink-500', message: 'Feeling frustrated is normal when learning new things. You\'re doing great!' },
    { id: 'excited', emoji: '🤩', label: 'Excited!', color: 'from-pink-400 to-rose-500', message: 'Your excitement is contagious! I love your enthusiasm for learning!' }
  ];

  const encouragements = [
    "You're braver than you believe! 🦁",
    "Every expert was once a beginner! 🌱",
    "Your potential is endless! ✨",
    "Mistakes are proof you're trying! 💪",
    "You make learning look fun! 🎉",
    "Your curiosity is your superpower! 🔍"
  ];

  const activities = [
    { mood: 'sad', activity: 'Listen to calming music', icon: '🎵' },
    { mood: 'frustrated', activity: 'Take deep breaths', icon: '🫧' },
    { mood: 'okay', activity: 'Play a fun game', icon: '🎮' },
    { mood: 'happy', activity: 'Share your joy', icon: '🤗' },
    { mood: 'excited', activity: 'Channel that energy', icon: '⚡' },
    { mood: 'amazing', activity: 'Celebrate yourself', icon: '🎊' }
  ];

  // Fetch recent mood data when component mounts
  useEffect(() => {
    if (userData?.uid) { // Changed from user?.uid
      fetchRecentMoods();
    }
  }, [userData]); // Changed from [user]

  const fetchRecentMoods = async () => {
    try {
      const response = await axios.get(`${API}/api/emotional/child/${userData?.uid}`); // Changed from user?.uid
      setWeeklyMoods(response.data.recentMoods || []);
    } catch (error) {
      console.error('Error fetching mood history:', error);
    }
  };

  const handleMoodSelect = (moodId: string) => {
    setCurrentMood(moodId);
  };

  const handleSaveThoughts = async () => {
    if (!currentMood || !userData?.uid) { // Changed from user?.uid
      alert('Please select a mood first!');
      return;
    }

    try {
      setSaving(true);
      await axios.post('https://smart-learning-node-backend-og.onrender.com/api/emotional/save', {
        userId: userData.uid, // Changed from user.uid
        mood: currentMood,
        notes: feedback,
        activities: selectedActivities
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      // Refresh the mood history
      fetchRecentMoods();
      
      // Reset form
      setFeedback('');
      setSelectedActivities([]);
      
    } catch (error) {
      console.error('Error saving emotional feedback:', error);
      alert('Failed to save your thoughts. Please try again!');
    } finally {
      setSaving(false);
    }
  };

  const selectedMood = moods.find(mood => mood.id === currentMood);
  const suggestedActivity = activities.find(activity => activity.mood === currentMood);

  // Get emoji for mood string
  const getMoodEmoji = (moodId: string) => {
    const mood = moods.find(m => m.id === moodId);
    return mood ? mood.emoji : '😐';
  };

  // Get last 7 days of moods
  const getLast7DaysMoods = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      const dayName = days[dayIndex];
      
      // Find mood for this day from weeklyMoods
      const dayMood = weeklyMoods[6 - i];
      const emoji = dayMood ? getMoodEmoji(dayMood.mood) : '😐';
      
      last7Days.push({ day: dayName, emoji });
    }
    
    return last7Days;
  };

  const last7DaysMoods = getLast7DaysMoods();

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce z-50">
            <p className="font-bold">✨ Your thoughts have been saved! 💝</p>
          </div>
        )}

        {/* Header */}
        <section className="text-center mb-12">
          <div className="text-8xl mb-6 animate-bounce">💝</div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-4">
            How Are You Feeling Today?
          </h1>
          <p className="text-2xl text-purple-700 mb-8">
            Your feelings matter! Let's check in with your heart 💕
          </p>
        </section>

        {/* Mood Selection */}
        <section className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {moods.map((mood) => (
              <button
                key={mood.id}
                onClick={() => handleMoodSelect(mood.id)}
                className={`p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center ${
                  currentMood === mood.id
                    ? `bg-gradient-to-br ${mood.color} text-white scale-105 shadow-2xl`
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-6xl mb-4">{mood.emoji}</div>
                <h3 className="text-xl font-bold">{mood.label}</h3>
              </button>
            ))}
          </div>
        </section>

        {/* Mood Feedback */}
        {selectedMood && (
          <section className="mb-12">
            <div className={`bg-gradient-to-br ${selectedMood.color} rounded-3xl p-12 shadow-2xl text-white text-center`}>
              <div className="text-8xl mb-6">{selectedMood.emoji}</div>
              <h2 className="text-3xl font-bold mb-6">
                You're feeling {selectedMood.label.toLowerCase()}!
              </h2>
              <p className="text-xl leading-relaxed mb-8">
                {selectedMood.message}
              </p>
              
              {/* Suggested Activity */}
              {suggestedActivity && (
                <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="text-4xl mb-3">{suggestedActivity.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">Suggested Activity:</h3>
                  <p className="text-lg">{suggestedActivity.activity}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Encouragement Cards */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-purple-700 text-center mb-8 flex items-center justify-center space-x-3">
            <Heart className="h-8 w-8" />
            <span>Daily Encouragement</span>
            <Heart className="h-8 w-8" />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {encouragements.map((encouragement, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-center border-2 border-transparent hover:border-purple-200"
              >
                <div className="text-4xl mb-4">✨</div>
                <p className="text-lg font-semibold text-purple-700">
                  {encouragement}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feelings Journal */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📖</div>
              <h2 className="text-3xl font-bold text-orange-700 mb-4">
                My Feelings Journal
              </h2>
              <p className="text-lg text-gray-700">
                Want to tell me more about how you're feeling? Writing helps!
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full h-32 p-4 rounded-2xl border-2 border-orange-200 focus:border-orange-400 focus:outline-none text-lg resize-none"
                placeholder="Tell me about your day... What made you smile? What was challenging? I'm here to listen! 💕"
              />
              
              <div className="text-center mt-6">
                <button
                  onClick={handleSaveThoughts}
                  disabled={!currentMood || saving}
                  className={`bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-4 rounded-2xl text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                    (!currentMood || saving) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {saving ? 'Saving... 💫' : 'Save My Thoughts 💝'}
                </button>
                {!currentMood && (
                  <p className="text-sm text-orange-600 mt-2">Please select a mood first!</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Mood Tracking Progress */}
        <section>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-xl text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-3xl font-bold text-green-700 mb-6">
              This Week's Mood Journey
            </h2>
            
            <div className="flex justify-center space-x-4 mb-6">
              {last7DaysMoods.map((dayData, index) => (
                <div key={index} className="text-center">
                  <div className="text-sm font-semibold text-gray-600 mb-2">{dayData.day}</div>
                  <div className="text-3xl">
                    {dayData.emoji}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-lg text-gray-700 leading-relaxed">
              {weeklyMoods.length > 0 ? (
                <>Look at your mood pattern! You've tracked {weeklyMoods.length} mood{weeklyMoods.length !== 1 ? 's' : ''} recently! 
                Remember, all feelings are okay and help you grow stronger! 🌱</>
              ) : (
                <>Start tracking your moods to see your emotional journey! 
                Every feeling helps you understand yourself better! 🌱</>
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EmotionalFeedback;
