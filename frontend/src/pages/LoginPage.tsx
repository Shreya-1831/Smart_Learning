import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, userData } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(formData.identifier, formData.password);

      // Wait a moment for userData to update, then redirect
      setTimeout(() => {
        if (userData) {
          if (userData.role === 'student') {
            if (userData.firstLogin) {
              navigate('/mental-age-test');
            } else {
              navigate('/student-dashboard');
            }
          } else if (userData.role === 'parent') {
            navigate('/parent-dashboard');
          } else if (userData.role === 'teacher') {
            navigate('/teacher-dashboard');
          }
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setLoading(true);

    try {
      if (!resetEmail) {
        throw new Error('Please enter your email address');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
        throw new Error('Please enter a valid email address');
      }

      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess('✅ Password reset email sent! Check your inbox.');
      setResetEmail('');

      // Close modal after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate('/mental-age-test');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome Back! 👋
          </h1>
          <p className="text-gray-600">Sign in to continue your learning journey</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎓 Roll Number or 📧 Email
            </label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Enter roll number or email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Students: Enter roll number • Parents/Teachers: Enter email
            </p>
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔒 Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 ml-auto"
            >
              <KeyRound size={16} />
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Signing In...' : 'Sign In 🚀'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-purple-600 hover:text-purple-800 font-semibold"
          >
            Sign up!
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Reset Password
              </h2>
              <p className="text-gray-600">
                Enter your email and we'll send you a password reset link
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📧 Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  We'll send a password reset link to this email
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setResetSuccess('');
                    setResetEmail('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
