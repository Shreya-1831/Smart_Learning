import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MentalAgeTest from './pages/MentalAgeTest';
import StudentDashboard from './pages/StudentDashboard';
import EmotionalFeedback from './pages/EmotionalFeedback';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import OutcomesPage from './pages/OutcomesPage';
import SpellBeeCompetition from './pages/SpellBeeCompetition';
import WordBuildingGame from './pages/WordBuildingGame';
import ReadingPractice from './pages/ReadingPractice';
import WritingPractice from './pages/WritingPractice';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/mental-age-test"
              element={
                <ProtectedRoute allowedRoles={['student']} requiresFirstLogin>
                  <MentalAgeTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emotional-feedback"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <EmotionalFeedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent-dashboard"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-dashboard"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/outcomes"
              element={
                <ProtectedRoute>
                  <OutcomesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spelling-game"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <SpellBeeCompetition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/word-building"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <WordBuildingGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading-practice"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ReadingPractice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/writing-practice"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <WritingPractice />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;