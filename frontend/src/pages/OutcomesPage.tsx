import { useState, useEffect } from 'react';
import { Award, Star, Trophy, Gift, Target, Zap, Lock, Sparkles} from 'lucide-react';
import { useAuth } from "../contexts/AuthContext";
import axios from 'axios';

interface Tier {
  level: number;
  target: number;
  reward: {
    coins: number;
    points: number;
  };
  completed: boolean;
}

interface ProgressiveAchievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  currentProgress: number;
  currentTarget: number;
  percentage: number;
  currentTier: number;
  totalTiers: number;
  stars: number;
  completedTiers: number;
  allCompleted: boolean;
  nextReward: {
    coins: number;
    points: number;
  };
  allTiers: Tier[];
}

const OutcomesPage = () => {
  const { userData } = useAuth();
  const [studentName] = useState(userData?.name || "Student");
  const [achievements, setAchievements] = useState<ProgressiveAchievement[]>([]);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalPossible: 0,
    totalStars: 0,
    completionPercentage: 0
  });
  const API = import.meta.env.VITE_API_URL;
  const [loading, setLoading] = useState(true);

  // ✅ CELEBRATION POPUP STATE
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    achievementTitle: string;
    achievementIcon: string;
    tierLevel: number;
    reward: { coins: number; points: number };
  } | null>(null);

  // ✅ Get unique key for each tier completion (persists across sessions)
  const getTierCompletionKey = (achievementId: string, tierLevel: number) => {
    return `tier_completed_${userData?.uid}_${achievementId}_tier${tierLevel}`;
  };

  // ✅ Check if we already celebrated this tier
  const hasShownCelebration = (achievementId: string, tierLevel: number): boolean => {
    const key = getTierCompletionKey(achievementId, tierLevel);
    return localStorage.getItem(key) === 'celebrated';
  };

  // ✅ Mark this tier as celebrated
  const markCelebrationShown = (achievementId: string, tierLevel: number) => {
    const key = getTierCompletionKey(achievementId, tierLevel);
    localStorage.setItem(key, 'celebrated');
    console.log(`✅ Marked tier ${tierLevel} of ${achievementId} as celebrated`);
  };

  useEffect(() => {
    if (userData?.uid) {
      fetchAchievements();
    }
  }, [userData]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/progressive-achievements/${userData?.uid}`);
      console.log('🏆 Progressive achievements:', response.data);

      const fetchedAchievements = response.data.achievements;

      // ✅ CHECK FOR NEWLY COMPLETED TIERS
      // Compare with previous state to detect NEW completions
      if (achievements.length > 0) {
        fetchedAchievements.forEach((newAch: ProgressiveAchievement) => {
          const oldAch = achievements.find(a => a.id === newAch.id);

          if (oldAch && newAch.completedTiers > oldAch.completedTiers) {
            // A new tier was just completed!
            const completedTierLevel = newAch.completedTiers;
            const completedTier = newAch.allTiers[completedTierLevel - 1];

            // Only show if not already celebrated
            if (!hasShownCelebration(newAch.id, completedTierLevel)) {
              console.log(`🎉 NEW TIER COMPLETED: ${newAch.title} - Tier ${completedTierLevel}`);

              setCelebrationData({
                achievementTitle: newAch.title,
                achievementIcon: newAch.icon,
                tierLevel: completedTierLevel,
                reward: completedTier.reward
              });

              setShowCelebration(true);
              markCelebrationShown(newAch.id, completedTierLevel);

              // Auto-hide after 4 seconds
              setTimeout(() => {
                setShowCelebration(false);
                setCelebrationData(null);
              }, 4000);

              return; // Show only one celebration at a time
            }
          }
        });
      }

      setAchievements(fetchedAchievements);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ MANUAL REFRESH (when user returns from activity)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userData?.uid) {
        console.log('👀 Page visible - checking for new completions...');
        fetchAchievements();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData, achievements]);

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' = 'bg') => {
    const colors: any = {
      green: { bg: 'from-green-400 to-emerald-500', text: 'text-green-600', border: 'border-green-300' },
      blue: { bg: 'from-blue-400 to-cyan-500', text: 'text-blue-600', border: 'border-blue-300' },
      yellow: { bg: 'from-yellow-400 to-orange-500', text: 'text-yellow-600', border: 'border-yellow-300' },
      purple: { bg: 'from-purple-400 to-pink-500', text: 'text-purple-600', border: 'border-purple-300' },
      pink: { bg: 'from-pink-400 to-rose-500', text: 'text-pink-600', border: 'border-pink-300' },
    };
    return colors[color]?.[variant] || colors.green[variant];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* ✅ TIER COMPLETION CELEBRATION POPUP */}
      {showCelebration && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center animate-bounce-in max-w-md">
            <div className="text-9xl mb-4 animate-bounce">{celebrationData.achievementIcon}</div>

            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 mb-2">
              Tier {celebrationData.tierLevel} Complete!
            </h2>

            <h3 className="text-2xl font-bold text-purple-700 mb-4">
              {celebrationData.achievementTitle}
            </h3>

            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-6 mb-4">
              <div className="text-6xl mb-3">🎁</div>
              <div className="text-xl font-bold text-gray-800 mb-2">You Earned:</div>
              <div className="flex items-center justify-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {celebrationData.reward.coins}
                  </div>
                  <div className="text-sm text-gray-600">Coins 🪙</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {celebrationData.reward.points}
                  </div>
                  <div className="text-sm text-gray-600">Points ⭐</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-2 mb-4">
              <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
              <Trophy className="w-10 h-10 text-yellow-600 animate-bounce" />
              <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            </div>

            <p className="text-gray-600 text-sm">
              Keep going to unlock the next tier! 🚀
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <section className="text-center mb-12">
          <div className="text-8xl mb-6 animate-bounce">🏆</div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mb-4">
            {studentName}'s Achievement Journey
          </h1>
          <p className="text-2xl text-purple-700 mb-8">
            Complete challenges to unlock rewards and level up! 🌟
          </p>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white text-center shadow-xl">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="text-lg font-semibold mb-1">Total Stars</h3>
            <p className="text-3xl font-bold">{stats.totalStars}</p>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white text-center shadow-xl">
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-lg font-semibold mb-1">Completed</h3>
            <p className="text-3xl font-bold">{stats.totalCompleted}/{stats.totalPossible}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl p-6 text-white text-center shadow-xl">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="text-lg font-semibold mb-1">Progress</h3>
            <p className="text-3xl font-bold">{stats.completionPercentage}%</p>
          </div>

          <div className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl p-6 text-white text-center shadow-xl">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-lg font-semibold mb-1">Categories</h3>
            <p className="text-3xl font-bold">{achievements.length}</p>
          </div>
        </section>

        {/* Progressive Achievements */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-purple-700 mb-8 flex items-center space-x-3">
            <Target className="h-8 w-8" />
            <span>Your Achievements</span>
          </h2>

          <div className="space-y-6">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                {/* Achievement Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`text-6xl bg-gradient-to-br ${getColorClasses(achievement.color, 'bg')} p-4 rounded-2xl`}>
                      {achievement.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">{achievement.title}</h3>
                      <p className="text-gray-600">{achievement.description}</p>
                      <div className="flex items-center mt-2 space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < achievement.stars
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-semibold text-gray-600">
                          {achievement.stars}/{achievement.totalTiers} Stars
                        </span>
                      </div>
                    </div>
                  </div>

                  {!achievement.allCompleted && (
                    <div className="text-right bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-3">
                      <div className="text-xs text-gray-600 mb-1">Next Reward</div>
                      <div className="flex items-center space-x-2">
                        <Gift className="h-5 w-5 text-yellow-600" />
                        <span className="font-bold text-yellow-700">
                          {achievement.nextReward.coins} 🪙
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        +{achievement.nextReward.points} points
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {achievement.allCompleted ? 'ALL TIERS COMPLETED! 🎉' : `Tier ${achievement.currentTier}/${achievement.totalTiers}`}
                    </span>
                    <span className={`text-sm font-bold ${getColorClasses(achievement.color, 'text')}`}>
                      {achievement.currentProgress} / {achievement.currentTarget}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 bg-gradient-to-r ${getColorClasses(achievement.color, 'bg')} transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${achievement.percentage}%` }}
                    >
                      {achievement.percentage >= 20 && (
                        <span className="text-xs font-bold text-white">
                          {achievement.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tier Breakdown */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-700 flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>All Tiers</span>
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {achievement.allTiers.map((tier) => (
                      <div
                        key={tier.level}
                        className={`rounded-xl p-3 text-center transition-all ${
                          tier.completed
                            ? `bg-gradient-to-br ${getColorClasses(achievement.color, 'bg')} text-white shadow-lg`
                            : tier.level === achievement.currentTier
                            ? `bg-white border-2 ${getColorClasses(achievement.color, 'border')}`
                            : 'bg-white border border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          {tier.completed ? (
                            <Zap className="h-6 w-6" />
                          ) : tier.level === achievement.currentTier ? (
                            <Target className="h-6 w-6 text-gray-600" />
                          ) : (
                            <Lock className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className={`text-xs font-bold ${tier.completed ? '' : 'text-gray-600'}`}>
                          Tier {tier.level}
                        </div>
                        <div className={`text-lg font-bold ${tier.completed ? '' : 'text-gray-700'}`}>
                          {tier.target}
                        </div>
                        <div className={`text-xs ${tier.completed ? '' : 'text-gray-500'}`}>
                          🪙 {tier.reward.coins}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Celebration */}
        <section className="text-center">
          <div className="bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 rounded-3xl p-12 shadow-2xl text-white">
            <div className="text-8xl mb-6">🎊</div>
            <h2 className="text-4xl font-bold mb-6">Keep Up the Amazing Work!</h2>
            <p className="text-xl leading-relaxed mb-8 max-w-3xl mx-auto">
              Every tier you complete brings you closer to mastery! 
              Complete activities to progress through the tiers and earn awesome rewards! 💪
            </p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Continue Learning 🚀
            </button>
          </div>
        </section>

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

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OutcomesPage;
