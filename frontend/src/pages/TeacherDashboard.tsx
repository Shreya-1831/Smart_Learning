import { useState, useEffect } from 'react';
import { Users, Brain, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface StudentData {
  id: string;
  name: string;
  email: string;
  rollNo?: string;
  mentalAge?: number;
  overallProgress: number;
  activities?: {
    writing?: { average: number; count: number };
    reading?: { average: number; count: number };
    spellBee?: { average: number; count: number };
    wordGame?: { average: number; count: number };
  };
}

interface MentalHealthData {
  id: string;
  name: string;
  rollNo?: string;
  mentalHealthScore: number;
  recentMood: string;
  totalCheckins: number;
  needsAttention: boolean;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
}

const COLORS = {
  writing: '#8B5CF6',
  reading: '#3B82F6',
  spellBee: '#10B981',
  wordGame: '#F59E0B',
};

const TeacherDashboard = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [mentalHealthData, setMentalHealthData] = useState<MentalHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'academic' | 'mental' | 'leaderboard'>('academic');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const API = import.meta.env.VITE_API_URL || "https://smart-learning-node-backend-og.onrender.com";

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await axios.get(`${API}/api/leaderboard`);
      const data: LeaderboardEntry[] = res.data.map((entry: any, index: number) => ({
        userId: entry.userId,
        name: entry.name,
        score: entry.score,
        rank: index + 1,
      }));
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/teacher/students`);
      const studentsData = response.data;

      const mentalData: MentalHealthData[] = studentsData.map((student: any) => ({
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        mentalHealthScore: student.mentalHealthScore || 0,
        recentMood: student.recentMood || 'Unknown',
        totalCheckins: student.totalCheckins || 0,
        needsAttention: (student.mentalHealthScore || 0) < 50,
      }));

      setStudents(studentsData);
      setMentalHealthData(mentalData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMoodEmoji = (mood: string) => {
    const moodMap: { [key: string]: string } = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      calm: '😌',
      excited: '🤩',
    };
    return moodMap[mood.toLowerCase()] || '😐';
  };

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

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.overallProgress > 0).length;
  const needsAttention = students.filter((s) => s.overallProgress < 50 && s.overallProgress > 0).length;
  const avgProgress = students.length > 0
    ? students.reduce((sum, s) => sum + s.overallProgress, 0) / students.length
    : 0;

  const mentalHealthNeedsAttention = mentalHealthData.filter((m) => m.mentalHealthScore < 50).length;
  const avgMentalHealth = mentalHealthData.length > 0
    ? mentalHealthData.reduce((sum, m) => sum + m.mentalHealthScore, 0) / mentalHealthData.length
    : 0;

  const activityStats = {
    writing: {
      average: students.length > 0
        ? students.reduce((sum, s) => sum + (s.activities?.writing?.average || 0), 0) / students.length
        : 0,
      total: students.reduce((sum, s) => sum + (s.activities?.writing?.count || 0), 0)
    },
    reading: {
      average: students.length > 0
        ? students.reduce((sum, s) => sum + (s.activities?.reading?.average || 0), 0) / students.length
        : 0,
      total: students.reduce((sum, s) => sum + (s.activities?.reading?.count || 0), 0)
    },
    spellBee: {
      average: students.length > 0
        ? students.reduce((sum, s) => sum + (s.activities?.spellBee?.average || 0), 0) / students.length
        : 0,
      total: students.reduce((sum, s) => sum + (s.activities?.spellBee?.count || 0), 0)
    },
    wordGame: {
      average: students.length > 0
        ? students.reduce((sum, s) => sum + (s.activities?.wordGame?.average || 0), 0) / students.length
        : 0,
      total: students.reduce((sum, s) => sum + (s.activities?.wordGame?.count || 0), 0)
    }
  };

  const totalActivities =
    activityStats.writing.total +
    activityStats.reading.total +
    activityStats.spellBee.total +
    activityStats.wordGame.total;

  const activityAverageData = [
    { name: 'Writing', average: activityStats.writing.average, fill: COLORS.writing },
    { name: 'Reading', average: activityStats.reading.average, fill: COLORS.reading },
    { name: 'Spell Bee', average: activityStats.spellBee.average, fill: COLORS.spellBee },
    { name: 'Word Game', average: activityStats.wordGame.average, fill: COLORS.wordGame },
  ];

  const activityEngagementData = [
    { name: 'Writing', value: activityStats.writing.total },
    { name: 'Reading', value: activityStats.reading.total },
    { name: 'Spell Bee', value: activityStats.spellBee.total },
    { name: 'Word Game', value: activityStats.wordGame.total },
  ];

  const studentPerformanceData = students.map(student => ({
    name: student.name.split(' ')[0],
    'Writing': student.activities?.writing?.average || 0,
    'Reading': student.activities?.reading?.average || 0,
    'Spell Bee': student.activities?.spellBee?.average || 0,
    'Word Game': student.activities?.wordGame?.average || 0,
  }));

  const classAverageRadarData = [
    { subject: 'Writing', average: activityStats.writing.average, fullMark: 100 },
    { subject: 'Reading', average: activityStats.reading.average, fullMark: 100 },
    { subject: 'Spell Bee', average: activityStats.spellBee.average, fullMark: 100 },
    { subject: 'Word Game', average: activityStats.wordGame.average, fullMark: 100 },
  ];

  const PIE_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
            Teacher Dashboard
          </h1>
          <p className="text-gray-700">Monitor student progress and provide holistic support</p>
        </div>

        {/* ✅ CLEAN 6-CARD STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold opacity-90">Total Students</span>
              <Users className="h-6 w-6" />
            </div>
            <p className="text-4xl font-bold">{totalStudents}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold opacity-90">Active Students</span>
              <Users className="h-6 w-6" />
            </div>
            <p className="text-4xl font-bold">{activeStudents}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold opacity-90">Total Activities</span>
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-4xl font-bold">{totalActivities}</p>
            <p className="text-xs opacity-80 mt-1">All sessions</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold opacity-90">Avg Academic Score</span>
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-4xl font-bold">{avgProgress.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold opacity-90">Avg Mental Health</span>
              <Brain className="h-6 w-6" />
            </div>
            <p className="text-4xl font-bold">{avgMentalHealth.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold opacity-90">Needs Support</span>
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-4xl font-bold">{mentalHealthNeedsAttention}</p>
            <p className="text-xs opacity-80 mt-1">Academic: {needsAttention}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('academic')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'academic'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            📚 Academic Progress
          </button>
          <button
            onClick={() => setActiveTab('mental')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'mental'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            🧠 Mental Health
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'leaderboard'
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            🏆 Spell Bee Leaderboard
          </button>
        </div>

        {/* Academic Tab */}
        {activeTab === 'academic' && (
          <>
            {/* Activity Performance Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Activity Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Writing</h3>
                  <div className="mb-4">
                    <p className="text-sm opacity-90 mb-2">Average</p>
                    <p className="text-4xl font-bold">{activityStats.writing.average.toFixed(1)}%</p>
                    <div className="w-full bg-white/30 rounded-full h-2 mt-3">
                      <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${activityStats.writing.average}%` }} />
                    </div>
                  </div>
                  <div className="border-t border-white/30 pt-3">
                    <p className="text-sm opacity-90">Completed</p>
                    <p className="text-2xl font-bold">{activityStats.writing.total} times</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Reading</h3>
                  <div className="mb-4">
                    <p className="text-sm opacity-90 mb-2">Average</p>
                    <p className="text-4xl font-bold">{activityStats.reading.average.toFixed(1)}%</p>
                    <div className="w-full bg-white/30 rounded-full h-2 mt-3">
                      <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${activityStats.reading.average}%` }} />
                    </div>
                  </div>
                  <div className="border-t border-white/30 pt-3">
                    <p className="text-sm opacity-90">Completed</p>
                    <p className="text-2xl font-bold">{activityStats.reading.total} times</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Spell Bee</h3>
                  <div className="mb-4">
                    <p className="text-sm opacity-90 mb-2">Average</p>
                    <p className="text-4xl font-bold">{activityStats.spellBee.average.toFixed(1)}%</p>
                    <div className="w-full bg-white/30 rounded-full h-2 mt-3">
                      <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${activityStats.spellBee.average}%` }} />
                    </div>
                  </div>
                  <div className="border-t border-white/30 pt-3">
                    <p className="text-sm opacity-90">Completed</p>
                    <p className="text-2xl font-bold">{activityStats.spellBee.total} times</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Word Game</h3>
                  <div className="mb-4">
                    <p className="text-sm opacity-90 mb-2">Average</p>
                    <p className="text-4xl font-bold">{activityStats.wordGame.average.toFixed(1)}%</p>
                    <div className="w-full bg-white/30 rounded-full h-2 mt-3">
                      <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${activityStats.wordGame.average}%` }} />
                    </div>
                  </div>
                  <div className="border-t border-white/30 pt-3">
                    <p className="text-sm opacity-90">Completed</p>
                    <p className="text-2xl font-bold">{activityStats.wordGame.total} times</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Averages</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityAverageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" name="Average Score (%)" radius={[10, 10, 0, 0]}>
                      {activityAverageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityEngagementData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityEngagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Class Performance Overview</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={classAverageRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Average Score" dataKey="average" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {students.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Student Comparison</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={studentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Writing" fill={COLORS.writing} />
                      <Bar dataKey="Reading" fill={COLORS.reading} />
                      <Bar dataKey="Spell Bee" fill={COLORS.spellBee} />
                      <Bar dataKey="Word Game" fill={COLORS.wordGame} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Student Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Individual Student Performance</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading students...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl text-gray-600">No students found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Student</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Roll No</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Overall</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">✍️ Writing</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">📖 Reading</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">🐝 Spell Bee</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">🎮 Word Game</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-bold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{student.rollNo || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-gray-900">{student.overallProgress.toFixed(1)}%</span>
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${getProgressColor(student.overallProgress)}`} style={{ width: `${student.overallProgress}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2.5 w-20">
                                  <div className="bg-gradient-to-r from-purple-400 to-purple-500 h-2.5 rounded-full transition-all" style={{ width: `${student.activities?.writing?.average || 0}%` }} />
                                </div>
                                <span className="text-sm font-bold text-purple-600 w-12">{(student.activities?.writing?.average || 0).toFixed(1)}%</span>
                              </div>
                              <p className="text-xs text-gray-500">{student.activities?.writing?.count || 0} attempts</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2.5 w-20">
                                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${student.activities?.reading?.average || 0}%` }} />
                                </div>
                                <span className="text-sm font-bold text-blue-600 w-12">{(student.activities?.reading?.average || 0).toFixed(1)}%</span>
                              </div>
                              <p className="text-xs text-gray-500">{student.activities?.reading?.count || 0} attempts</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2.5 w-20">
                                  <div className="bg-gradient-to-r from-green-400 to-green-500 h-2.5 rounded-full transition-all" style={{ width: `${(student.activities?.spellBee?.average ?? 0) / 4}%` }} />
                                </div>
                                <span className="text-sm font-bold text-green-600 w-12">{((student.activities?.spellBee?.average ?? 0) / 4).toFixed(1)}%</span>
                              </div>
                              <p className="text-xs text-gray-500">{student.activities?.spellBee?.count || 0} attempts</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2.5 w-20">
                                  <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-2.5 rounded-full transition-all" style={{ width: `${student.activities?.wordGame?.average || 0}%` }} />
                                </div>
                                <span className="text-sm font-bold text-orange-600 w-12">{(student.activities?.wordGame?.average || 0).toFixed(1)}%</span>
                              </div>
                              <p className="text-xs text-gray-500">{student.activities?.wordGame?.count || 0} attempts</p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Mental Health Tab */}
        {activeTab === 'mental' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
                <p className="text-sm text-gray-600 mb-1">Students with Good Mental Health</p>
                <p className="text-3xl font-bold text-green-700">{mentalHealthData.filter(s => s.mentalHealthScore >= 75).length}</p>
                <p className="text-xs text-gray-500 mt-1">Score ≥ 75%</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg border-l-4 border-yellow-500">
                <p className="text-sm text-gray-600 mb-1">Need Monitoring</p>
                <p className="text-3xl font-bold text-yellow-700">{mentalHealthData.filter(s => s.mentalHealthScore >= 50 && s.mentalHealthScore < 75).length}</p>
                <p className="text-xs text-gray-500 mt-1">Score 50-74%</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border-l-4 border-red-500">
                <p className="text-sm text-gray-600 mb-1">Needs Attention</p>
                <p className="text-3xl font-bold text-red-700">{mentalHealthData.filter(s => s.mentalHealthScore < 50).length}</p>
                <p className="text-xs text-gray-500 mt-1">Score &lt; 50%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
                <p className="text-sm text-gray-600 mb-1">Total Check-ins</p>
                <p className="text-3xl font-bold text-purple-700">{mentalHealthData.reduce((sum, s) => sum + s.totalCheckins, 0)}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Mental Health Overview</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading mental health data...</p>
                </div>
              ) : mentalHealthData.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl text-gray-600">No mental health check-ins yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Student</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Roll No</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Mental Health Score</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Recent Mood</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Total Check-ins</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mentalHealthData.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-bold text-gray-900">{student.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{student.rollNo || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-gray-900">{student.mentalHealthScore}%</span>
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${getProgressColor(student.mentalHealthScore)}`} style={{ width: `${student.mentalHealthScore}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">{getMoodEmoji(student.recentMood)} {student.recentMood}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{student.totalCheckins}</td>
                          <td className="px-6 py-4">
                            {student.needsAttention ? (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">⚠️ Needs Attention</span>
                            ) : (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">✓ Good</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Mental Health Distribution</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mentalHealthData.map(student => ({ name: student.name.split(' ')[0], score: student.mentalHealthScore }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" name="Mental Health Score (%)" fill="#8B5CF6" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Class Mood Overview</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const moodCounts: { [key: string]: number } = {};
                          mentalHealthData.forEach(student => {
                            const mood = student.recentMood || 'Unknown';
                            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
                          });
                          return Object.entries(moodCounts).map(([mood, count]) => ({ name: mood, value: count }));
                        })()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(() => {
                          const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
                          const moodCounts: { [key: string]: number } = {};
                          mentalHealthData.forEach(student => {
                            const mood = student.recentMood || 'Unknown';
                            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
                          });
                          return Object.keys(moodCounts).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ));
                        })()}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Trophy className="h-8 w-8 mr-3 text-yellow-500" />
              Spell Bee Competition Leaderboard
            </h2>
            {loadingLeaderboard ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">No competition scores yet</p>
                <p className="text-gray-500 mt-2">Students haven't participated in Spell Bee competition</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-yellow-50 to-orange-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Student Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Score</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaderboard.map((entry) => (
                      <tr key={entry.userId} className={`hover:bg-yellow-50 transition-colors ${entry.rank <= 3 ? 'bg-yellow-50/50' : ''}`}>
                        <td className="px-6 py-4">
                          <span className={`text-3xl font-bold ${getRankColor(entry.rank)}`}>{getRankIcon(entry.rank)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <p className="text-lg font-bold text-gray-900">{entry.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-3xl font-bold text-yellow-600">{entry.score}</span>
                          <span className="text-sm text-gray-500 ml-2">points</span>
                        </td>
                        <td className="px-6 py-4">
                          {entry.rank <= 3 ? (
                            <span className="px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">🌟 Top Performer</span>
                          ) : (
                            <span className="px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Participant</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer Insight Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-green-700 mb-2">✨ Insight</h3>
            <p className="text-gray-700">Students are showing consistent improvement across all modules</p>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-blue-700 mb-2">💡 Tip</h3>
            <p className="text-gray-700">Monitor both academic and mental health for complete student wellbeing</p>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-purple-700 mb-2">🎯 Action</h3>
            <p className="text-gray-700">Identify students needing extra support in academics or mental health</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherDashboard;