import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';

interface ChildProgress {
  childInfo: {
    name: string;
    rollNo?: string;
    email: string;
    mentalAge?: number;
  };
  overallStats: {
    totalActivities: number;
    averageScore: string;
  };
  activityBreakdown: {
    writing: { average: string; total: number; recent: number[] };
    reading: { average: string; total: number; recent: number[] };
    spellBee: { average: string; total: number; recent: number[] };
    wordGame: { average: string; total: number; recent: number[] };
  };
  recentActivity: Array<{
    type: string;
    score?: number;
    accuracy?: number;
    timestamp: any;
  }>;
}

interface MentalHealthData {
  totalEntries: number;
  moodDistribution: Record<string, number>;
  recentMoods: Array<{ mood: string; timestamp: any; notes?: string }>;
  mentalHealthScore: number;
}

const ParentDashboard = () => {
  const { userData } = useAuth();
  const [childProgress, setChildProgress] = useState<ChildProgress | null>(null);
  const [mentalHealth, setMentalHealth] = useState<MentalHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.childUid) {
      setLoading(false);
      return;
    }

    const childId = userData.childUid;

    // Real-time listener for child data
    const unsubscribeChild = onSnapshot(
      doc(db, 'users', childId),
      async () => {
        console.log('🔄 Real-time update: Child data changed');
        await fetchChildData(childId);
      },
      (err) => {
        console.error('Error in child listener:', err);
        setError('Failed to listen to child updates');
        setLoading(false);
      }
    );

    // Real-time listeners for progress collections
    const progressCollections = ['writingProgress', 'readingProgress', 'spellBeeScores', 'wordGameScores', 'emotionalFeedback'];
    const progressUnsubscribers = progressCollections.map(collectionName => {
      const progressQuery = query(collection(db, collectionName), where('userId', '==', childId));
      return onSnapshot(progressQuery, async () => {
        console.log(`🔄 Real-time update: ${collectionName} changed`);
        await fetchChildData(childId);
      });
    });

    // Initial fetch
    fetchChildData(childId);

    return () => {
      unsubscribeChild();
      progressUnsubscribers.forEach(unsub => unsub());
    };
  }, [userData?.childUid]);

  const fetchChildData = async (childId: string) => {
    try {
      setError(null);
      
      // Fetch academic progress
      const progressResponse = await fetch(`http://localhost:4000/api/progress/child/${childId}`);
      if (!progressResponse.ok) throw new Error('Failed to fetch progress');
      const progressData = await progressResponse.json();
      setChildProgress(progressData);
      
      // Fetch mental health data
      const mentalHealthResponse = await fetch(`http://localhost:4000/api/emotional/child/${childId}`);
      if (mentalHealthResponse.ok) {
        const mentalHealthData = await mentalHealthResponse.json();
        setMentalHealth(mentalHealthData);
      }
      
    } catch (error) {
      console.error('Error fetching child data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading your child's progress...</p>
        </div>
      </div>
    );
  }

  if (!userData?.childUid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-yellow-500 p-6 rounded-lg shadow-lg">
            <div className="flex items-start">
              <svg className="w-8 h-8 text-yellow-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div>
                <h3 className="text-lg font-bold text-yellow-800 mb-2">No Child Account Linked</h3>
                <p className="text-yellow-700">Please contact support to link your child's account using their roll number.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !childProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-red-100 to-pink-100 border-l-4 border-red-500 p-6 rounded-lg shadow-lg">
            <div className="flex items-start">
              <svg className="w-8 h-8 text-red-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <div>
                <h3 className="text-lg font-bold text-red-800 mb-2">Unable to Load Progress</h3>
                <p className="text-red-700 mb-4">{error || 'The child account could not be found.'}</p>
                <button 
                  onClick={() => userData?.childUid && fetchChildData(userData.childUid)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const radarData = [
    { activity: 'Writing', score: parseFloat(childProgress.activityBreakdown.writing.average || '0'), fullMark: 100 },
    { activity: 'Reading', score: parseFloat(childProgress.activityBreakdown.reading.average || '0'), fullMark: 100 },
    { activity: 'Spell Bee', score: parseFloat(childProgress.activityBreakdown.spellBee.average || '0'), fullMark: 100 },
    { activity: 'Word Game', score: parseFloat(childProgress.activityBreakdown.wordGame.average || '0'), fullMark: 100 },
  ];

  const activityFrequencyData = [
    { name: 'Writing', attempts: childProgress.activityBreakdown.writing.total || 0 },
    { name: 'Reading', attempts: childProgress.activityBreakdown.reading.total || 0 },
    { name: 'Spell Bee', attempts: childProgress.activityBreakdown.spellBee.total || 0 },
    { name: 'Word Game', attempts: childProgress.activityBreakdown.wordGame.total || 0 },
  ];

  const recentTrendsData = (childProgress.recentActivity || [])
    .slice(0, 10)
    .reverse()
    .map((activity, index) => ({
      session: `S${index + 1}`,
      score: activity.score || activity.accuracy || 0,
      type: activity.type,
    }));

  // Mental health mood distribution for pie chart
  const moodColors: Record<string, string> = {
    happy: '#10b981',
    excited: '#f59e0b',
    sad: '#ef4444',
    anxious: '#8b5cf6',
    tired: '#6b7280',
    proud: '#3b82f6',
    grateful: '#ec4899',
  };

  const moodPieData = mentalHealth ? Object.entries(mentalHealth.moodDistribution).map(([mood, count]) => ({
    name: mood.charAt(0).toUpperCase() + mood.slice(1),
    value: count,
    color: moodColors[mood] || '#9ca3af'
  })) : [];

  const childName = childProgress?.childInfo?.name || 'Your Child';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {childName}'s Learning Journey 🌟
          </h1>
          <p className="text-gray-600">Track progress, celebrate achievements, and support growth</p>
          {childProgress.childInfo.rollNo && (
            <p className="text-sm text-gray-500 mt-1">Roll Number: {childProgress.childInfo.rollNo}</p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold opacity-90">Academic Performance</h3>
              <svg className="w-8 h-8 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
            <p className="text-5xl font-bold mb-2">{childProgress.overallStats.averageScore}%</p>
            <p className="text-sm opacity-90">Overall average score</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold opacity-90">Total Activities</h3>
              <svg className="w-8 h-8 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
            </div>
            <p className="text-5xl font-bold mb-2">{childProgress.overallStats.totalActivities}</p>
            <p className="text-sm opacity-90">Completed</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold opacity-90">Mental Age</h3>
              <svg className="w-8 h-8 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
              </svg>
            </div>
            <p className="text-5xl font-bold mb-2">
              {childProgress.childInfo.mentalAge ? `${childProgress.childInfo.mentalAge}` : 'N/A'}
            </p>
            <p className="text-sm opacity-90">Years</p>
          </div>

          {/* Mental Health Score Card */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold opacity-90">Mental Wellbeing</h3>
              <svg className="w-8 h-8 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
            </div>
            <p className="text-5xl font-bold mb-2">{mentalHealth?.mentalHealthScore || 0}%</p>
            <p className="text-sm opacity-90">Emotional health score</p>
          </div>
        </div>

        {/* Mental Health Section */}
        {mentalHealth && mentalHealth.totalEntries > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
              Mental Health & Emotional Wellbeing
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mood Distribution Pie Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Mood Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={moodPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {moodPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Moods Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Emotional Check-ins</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {mentalHealth.recentMoods.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl`} style={{ backgroundColor: moodColors[entry.mood] + '20' }}>
                        {entry.mood === 'happy' && '😊'}
                        {entry.mood === 'sad' && '😢'}
                        {entry.mood === 'anxious' && '😰'}
                        {entry.mood === 'excited' && '🤩'}
                        {entry.mood === 'tired' && '😴'}
                        {entry.mood === 'proud' && '🌟'}
                        {entry.mood === 'grateful' && '🙏'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 capitalize">{entry.mood}</p>
                        <p className="text-xs text-gray-500">
                          {entry.timestamp?.seconds 
                            ? new Date(entry.timestamp.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Recently'
                          }
                        </p>
                        {entry.notes && <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mental Health Insights */}
            <div className="mt-6 p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Total emotional check-ins:</strong> {mentalHealth.totalEntries} | 
                <strong className="ml-2">Mental health score:</strong> {mentalHealth.mentalHealthScore}% |
                {mentalHealth.mentalHealthScore >= 70 ? (
                  <span className="ml-2 text-green-700">✓ Doing great! Keep encouraging emotional expression.</span>
                ) : mentalHealth.mentalHealthScore >= 50 ? (
                  <span className="ml-2 text-yellow-700">⚠ Moderate - Consider spending more quality time together.</span>
                ) : (
                  <span className="ml-2 text-red-700">⚠ Needs attention - Consider professional support if needed.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Academic Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Skills Radar Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Skills Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="activity" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Performance" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Frequency Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Engagement</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityFrequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="attempts" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Performance Trend */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Performance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={recentTrendsData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="session" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Performance Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Activity Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(childProgress.activityBreakdown).map(([key, activity]) => {
              const colors = {
                writing: 'from-purple-400 to-purple-600',
                reading: 'from-blue-400 to-blue-600',
                spellBee: 'from-green-400 to-green-600',
                wordGame: 'from-orange-400 to-orange-600'
              };
              const color = colors[key as keyof typeof colors];
              
              return (
                <div key={key} className={`bg-gradient-to-br ${color} text-white p-6 rounded-xl shadow-lg`}>
                  <h3 className="font-bold text-lg capitalize mb-4">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm opacity-90">Average</span>
                      <span className="text-3xl font-bold">{activity.average}%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                      <div 
                        className="bg-white h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${activity.average}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-90">Completed</span>
                    <span className="font-bold text-lg">{activity.total} times</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl border-l-4 border-green-500 shadow-lg">
            <div className="flex items-start">
              <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-green-800 mb-2">Excellent Progress!</h3>
                <p className="text-sm text-green-700">
                  {childName} is consistently improving. Keep encouraging daily practice and celebrate small wins!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl border-l-4 border-blue-500 shadow-lg">
            <div className="flex items-start">
              <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-blue-800 mb-2">Holistic Development</h3>
                <p className="text-sm text-blue-700">
                  We're tracking both academic and emotional wellbeing to support {childName}'s complete development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
