import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from "react-router-dom";
import { BookOpen, PenTool, Mic, Gamepad2, Heart, Trophy, Flame, Award, ChevronRight, Book, Star, CheckCircle2, Clock, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
}

interface ReadingProgress {
  completedToday: number;
  totalReadings: number;
  recentScores: any[];
}

interface Challenge {
  id: number;
  type: string;
  title: string;
  description: string;
  target: number;
  difficulty: string;
  points: number;
  icon: string;
}

interface ChallengeProgress {
  current: number;
  target: number;
  completed: boolean;
  pointsEarned: number;
}

interface Achievement {
  id: number;
  name: string;
  icon: string;
  earned: boolean;
  description: string;
  date: string | null;
  type: string;
}

const StudentDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress>({
    completedToday: 0,
    totalReadings: 0,
    recentScores: []
  });
  const API = import.meta.env.VITE_API_URL;

  const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress>({
    current: 0,
    target: 0,
    completed: false,
    pointsEarned: 0
  });

  const [showChallengeComplete, setShowChallengeComplete] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  // ✅ NEW: Real-time achievements
  const [achievementsData, setAchievementsData] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  const challengeRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // ✅ ULTIMATE FIX: Use localStorage to persist across refreshes
  const getCelebrationKey = (type: 'challenge' | 'level', value: string | number) => {
    const today = new Date().toISOString().split('T')[0];
    return `celebration_${userData?.uid}_${type}_${today}_${value}`;
  };

  const hasShownCelebration = (type: 'challenge' | 'level', value: string | number): boolean => {
    const key = getCelebrationKey(type, value);
    return localStorage.getItem(key) === 'shown';
  };

  const markCelebrationShown = (type: 'challenge' | 'level', value: string | number) => {
    const key = getCelebrationKey(type, value);
    localStorage.setItem(key, 'shown');
    console.log(`✅ Marked ${type} celebration as shown:`, key);
  };

  useEffect(() => {
    if (userData?.uid) {
      fetchLeaderboard();
      fetchReadingProgress();
      fetchStudentStats();
      fetchDailyChallenge();
      fetchAchievementsData(); // ✅ NEW: Fetch real-time achievements
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.uid && dailyChallenge) {
      if (challengeRefreshInterval.current) {
        clearInterval(challengeRefreshInterval.current);
      }

      challengeRefreshInterval.current = setInterval(() => {
        console.log('🔄 Auto-refreshing challenge progress...');
        fetchDailyChallenge();
      }, 10000);

      return () => {
        if (challengeRefreshInterval.current) {
          clearInterval(challengeRefreshInterval.current);
        }
      };
    }
  }, [userData, dailyChallenge]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userData?.uid) {
        console.log('👀 Page visible - refreshing data...');
        fetchDailyChallenge();
        fetchStudentStats();
        fetchAchievementsData(); // ✅ NEW: Refresh achievements on page visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData]);

  // ✅ NEW: Fetch real-time achievements
  const fetchAchievementsData = async () => {
    try {
      setLoadingAchievements(true);
      const response = await axios.get(`${API}/api/achievements/${userData?.uid}`);
      console.log('🏆 Achievements data:', response.data);
      // Get only first 6 for dashboard
      setAchievementsData(response.data.achievements.slice(0, 6));
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const fetchDailyChallenge = async () => {
    if (!userData) return;

    try {
      const challengesRes = await axios.get(`${API}/api/challenges/daily`);
      const allChallenges = challengesRes.data.challenges;

      const today = new Date().toISOString().split('T')[0];
      const dateHash = today.split('-').reduce((a, b) => parseInt(a.toString()) + parseInt(b.toString()), 0);
      const randomIndex = dateHash % allChallenges.length;
      const selectedChallenge = allChallenges[randomIndex];

      setDailyChallenge(selectedChallenge);

      const progressRes = await axios.get(`${API}/api/challenges/progress/${userData.uid}`);
      const progress = progressRes.data.progress[selectedChallenge.type];

      console.log(`📊 Challenge Progress:`, progress);

      if (progress) {
        // ✅ ULTIMATE CHECK: Only show if JUST completed AND not shown before
        const wasIncomplete = !challengeProgress.completed;
        const isNowComplete = progress.completed;
        const justCompleted = wasIncomplete && isNowComplete;
        const notShownYet = !hasShownCelebration('challenge', selectedChallenge.type);

        if (justCompleted && notShownYet) {
          console.log('🎉 Challenge JUST completed! Showing celebration...');
          setShowChallengeComplete(true);
          markCelebrationShown('challenge', selectedChallenge.type);
          setTimeout(() => setShowChallengeComplete(false), 4000);
          // ✅ Refresh achievements when challenge completes
          fetchAchievementsData();
        } else if (isNowComplete && notShownYet) {
          console.log('⚠️ Challenge already complete, not showing popup on refresh');
        }

        setChallengeProgress(progress);
      } else {
        setChallengeProgress({
          current: 0,
          target: selectedChallenge.target,
          completed: false,
          pointsEarned: 0
        });
      }
    } catch (error) {
      console.error("Error fetching challenge:", error);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const response = await axios.get(`${API}/api/student/stats/${userData?.uid}`);
      console.log('📊 Student Stats:', response.data);

      const newLvl = response.data.level;
      const levelIncreased = level > 0 && newLvl > level;
      const notShownYet = !hasShownCelebration('level', newLvl);

      if (levelIncreased && notShownYet) {
        console.log(`🎊 Level up from ${level} to ${newLvl}! Showing celebration...`);
        setNewLevel(newLvl);
        setShowLevelUp(true);
        markCelebrationShown('level', newLvl);
        setTimeout(() => setShowLevelUp(false), 4000);
        // ✅ Refresh achievements when level up
        fetchAchievementsData();
      }

      setStreak(response.data.streak);
      setCoins(response.data.coins);
      setLevel(newLvl);
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await axios.get(`${API}/api/leaderboard`);
      const data: LeaderboardEntry[] = res.data;

      const rankedData = data.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setLeaderboard(rankedData);

      const userEntry = rankedData.find(entry => entry.userId === userData?.uid);
      setMyRank(userEntry || null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchReadingProgress = async () => {
    try {
      const response = await axios.get(`${API}/api/reading/progress/${userData?.uid}`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayReadings = response.data.readings.filter((reading: any) => {
        const readingDate = new Date(reading.timestamp);
        readingDate.setHours(0, 0, 0, 0);
        return readingDate.getTime() === today.getTime();
      });

      setReadingProgress({
        completedToday: todayReadings.length,
        totalReadings: response.data.readings.length,
        recentScores: response.data.readings.slice(0, 3)
      });
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const activities = [
    {
      id: 1,
      title: 'Reading Practice',
      icon: BookOpen,
      color: 'from-blue-400 to-cyan-500',
      path: '/reading-practice',
      description: 'Read exciting stories aloud',
      progress: 60,
      badge: '📚',
    },
    {
      id: 2,
      title: 'Writing Practice',
      icon: PenTool,
      color: 'from-green-400 to-emerald-500',
      path: '/writing-practice',
      description: 'Practice writing letters',
      progress: 45,
      badge: '✍️',
    },
    {
      id: 3,
      title: 'Spell Bee',
      icon: Mic,
      color: 'from-yellow-400 to-orange-500',
      path: '/spelling-game',
      description: 'Spell words correctly',
      progress: 80,
      badge: '🐝',
    },
    {
      id: 4,
      title: 'Word Building',
      icon: Gamepad2,
      color: 'from-purple-400 to-pink-500',
      path: '/word-building',
      description: 'Build words with AI',
      progress: 30,
      badge: '🎮',
    },
    {
      id: 5,
      title: 'Mood Check-in',
      icon: Heart,
      color: 'from-pink-400 to-rose-500',
      path: '/emotional-feedback',
      description: 'Share how you feel today',
      progress: 100,
      badge: '❤️',
    },
  ];

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-700';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const progressPercentage = dailyChallenge && challengeProgress.target > 0
    ? Math.min((challengeProgress.current / challengeProgress.target) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">

        {/* Challenge Completion Celebration */}
        {showChallengeComplete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-12 shadow-2xl text-center animate-bounce-in max-w-md">
              <div className="text-9xl mb-4 animate-spin-slow">🎉</div>
              <h2 className="text-4xl font-bold text-purple-600 mb-2">
                Challenge Complete!
              </h2>
              <p className="text-xl text-gray-700 mb-4">
                You earned {challengeProgress.pointsEarned} points! 🌟
              </p>
              <div className="text-6xl mb-4">✨🏆✨</div>
              <p className="text-sm text-gray-500">
                Come back tomorrow for a new challenge!
              </p>
            </div>
          </div>
        )}

        {/* Level Up Celebration */}
        {showLevelUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-12 shadow-2xl text-center animate-bounce-in max-w-md">
              <div className="text-9xl mb-4 animate-bounce">🎊</div>
              <h2 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
                LEVEL UP!
              </h2>
              <div className="text-8xl font-bold text-white my-6 drop-shadow-lg animate-pulse">
                {newLevel}
              </div>
              <p className="text-2xl text-white font-semibold mb-4">
                You're getting stronger! 💪
              </p>
              <div className="flex justify-center space-x-2">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
                <Trophy className="w-12 h-12 text-white animate-bounce" />
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            Welcome back, {userData?.name}!
          </h1>
          {userData?.mentalAge && (
            <p className="text-gray-600 text-lg">Learning Level: Age {userData.mentalAge}</p>
          )}
          <p className="text-gray-700 mt-2">Ready for another amazing learning adventure? Let's go! 🚀</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-700">Level</span>
                  <Award className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-700">{level}</p>
                <p className="text-xs text-purple-600">Learning Hero</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-yellow-700">Coins</span>
                  <Trophy className="h-5 w-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-yellow-700">{coins}</p>
                <p className="text-xs text-yellow-600">Keep earning!</p>
              </div>

              <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-orange-700">Streak</span>
                  <Flame className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-700">{streak} days</p>
                <p className="text-xs text-orange-600">Amazing!</p>
              </div>
            </div>

            {/* Daily Challenge Section */}
            {dailyChallenge && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Today's Challenge</h2>
                      <p className="text-sm text-gray-500">Complete it to earn bonus points!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600">
                      {challengeProgress.pointsEarned}
                    </div>
                    <div className="text-sm text-gray-500">
                      of {dailyChallenge.points} points
                    </div>
                  </div>
                </div>

                <div
                  className={`relative p-6 rounded-lg border-2 transition-all duration-300 ${challengeProgress.completed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300'
                    }`}
                >
                  {challengeProgress.completed && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    <div className="text-5xl">{dailyChallenge.icon}</div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">{dailyChallenge.title}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full ${getDifficultyColor(dailyChallenge.difficulty)}`}>
                          {dailyChallenge.difficulty}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4">{dailyChallenge.description}</p>

                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            {challengeProgress.current} / {challengeProgress.target}
                          </span>
                          <span className="text-sm font-bold text-purple-600">
                            {dailyChallenge.points} points
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${challengeProgress.completed
                                ? 'bg-green-500'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        {challengeProgress.completed ? (
                          <div className="flex items-center space-x-2 text-green-700 bg-green-100 p-3 rounded-lg">
                            <Zap className="w-5 h-5" />
                            <span className="font-medium">Completed! +{dailyChallenge.points} points earned! 🎉</span>
                          </div>
                        ) : challengeProgress.current > 0 ? (
                          <div className="flex items-center space-x-2 text-purple-600 bg-purple-100 p-3 rounded-lg">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">
                              {challengeProgress.target - challengeProgress.current} more to go! You're doing great! 💪
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-gray-600 bg-gray-100 p-3 rounded-lg">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">Start this challenge today! 🌟</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <p className="text-center text-sm text-gray-700 font-medium">
                    {challengeProgress.completed ? (
                      <>🏆 You're a superstar! Come back tomorrow for a new challenge!</>
                    ) : challengeProgress.current > 0 ? (
                      <>💪 Keep going! You're almost there!</>
                    ) : (
                      <>🌟 Every great journey begins with a single step. Start today!</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Activities Grid */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">🎯</span>
                Choose Your Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => {
                      navigate(activity.path);
                      setTimeout(() => {
                        fetchDailyChallenge();
                        fetchStudentStats();
                        fetchAchievementsData(); // ✅ Refresh achievements after activity
                      }, 2000);
                    }}
                    className={`bg-gradient-to-br ${activity.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-left relative overflow-hidden`}
                  >
                    <div className="absolute top-2 right-2 text-4xl opacity-20">
                      {activity.badge}
                    </div>
                    <activity.icon className="h-12 w-12 mb-3" />
                    <h3 className="text-2xl font-bold mb-4">{activity.title}</h3>
                    <p className="text-lg opacity-90 mb-4">{activity.description}</p>
                    {/* <div className="bg-white/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white h-full transition-all duration-500"
                        style={{ width: `${activity.progress}%` }}
                      />
                    </div>
                    <p className="text-xs mt-1 opacity-80">{activity.progress}% Complete</p> */}
                  </button>
                ))}
              </div>
            </div>

            {/* Achievements Section - ✅ NOW REAL-TIME */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-orange-700 flex items-center">
                  <Trophy className="h-7 w-7 mr-2" />
                  Your Achievements
                </h2>
                <Link
                  to="/outcomes"
                  className="text-purple-600 hover:text-purple-800 font-semibold flex items-center space-x-2"
                >
                  <span>View All</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {loadingAchievements ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading achievements...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {achievementsData.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`rounded-2xl p-4 text-center transition-all duration-300 ${achievement.earned
                        ? 'bg-white shadow-lg transform hover:scale-105'
                        : 'bg-gray-200 opacity-50'
                        }`}
                    >
                      <div className={`text-5xl mb-2 ${achievement.earned ? 'animate-bounce' : ''}`}>
                        {achievement.icon}
                      </div>
                      <h3 className={`text-sm font-bold mb-1 ${achievement.earned ? 'text-orange-700' : 'text-gray-600'}`}>
                        {achievement.name}
                      </h3>
                      <p className="text-xs text-gray-600">{achievement.description}</p>
                      {achievement.earned && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          ✓ Earned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reading Activity */}
            {readingProgress.recentScores.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Recent Reading Scores</h2>
                <div className="space-y-3">
                  {readingProgress.recentScores.map((reading: any, index: number) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-500 rounded-full p-3">
                          <Book className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Reading Practice</p>
                          <p className="text-xs text-gray-500">
                            {new Date(reading.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{reading.score}%</p>
                        <div className="flex space-x-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.round(reading.score / 20)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* My Rank Card */}
            {myRank && (
              <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl p-6 shadow-2xl border-4 border-yellow-400">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">{getRankIcon(myRank.rank)}</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">Your Rank</h3>
                  <p className="text-gray-600 text-sm">Spell Bee Competition</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 font-semibold">Rank</span>
                    <span className={`text-2xl font-bold ${getRankColor(myRank.rank)}`}>
                      {getRankIcon(myRank.rank)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-semibold">Score</span>
                    <span className="text-2xl font-bold text-purple-600">{myRank.score}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
                Spell Bee Leaderboard
              </h3>

              {loadingLeaderboard ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No scores yet!</p>
                  <p className="text-sm text-gray-500 mt-2">Be the first to compete!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`rounded-xl p-4 shadow-md transition-all ${entry.userId === userData?.uid
                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400'
                        : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
                            {getRankIcon(entry.rank)}
                          </span>
                          <div>
                            <p className={`font-bold ${entry.userId === userData?.uid ? 'text-purple-700' : 'text-gray-800'}`}>
                              {entry.name}
                              {entry.userId === userData?.uid && ' (You)'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-600">{entry.score}</p>
                          <p className="text-xs text-gray-500">points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Encouragement Card */}
            <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-3">🌟</div>
                <p className="text-gray-700 font-semibold">Keep practicing to improve your rank!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
