import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, updateUserData } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRollNoModal, setShowRollNoModal] = useState(false);
  const [googleRollNo, setGoogleRollNo] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    password: '',
    role: 'student' as 'student' | 'parent' | 'teacher',
    childRollNo: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error('Please fill in all required fields');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (formData.role === 'student') {
        if (!formData.rollNo) {
          throw new Error('Please enter your roll number');
        }

        if (!/^\d+$/.test(formData.rollNo)) {
          throw new Error('Roll number must contain only numbers');
        }

        await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.role,
          formData.rollNo
        );
      } else if (formData.role === 'parent') {
        if (!formData.childRollNo) {
          throw new Error("Please enter your child's roll number");
        }

        if (!/^\d+$/.test(formData.childRollNo)) {
          throw new Error("Child's roll number must contain only numbers");
        }

        await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.role,
          formData.childRollNo
        );
      } else {
        await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.role
        );
      }

      if (formData.role === 'student') navigate('/mental-age-test');
      else if (formData.role === 'parent') navigate('/parent-dashboard');
      else navigate('/teacher-dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      setShowRollNoModal(true);
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
      setLoading(false);
    }
  };

  const handleSaveRollNo = async () => {
    if (!/^\d+$/.test(googleRollNo)) {
      setError('Roll number must contain only numbers');
      return;
    }

    setLoading(true);
    try {
      await updateUserData({ rollNo: googleRollNo });
      navigate('/mental-age-test');
    } catch (err: any) {
      setError('Failed to save roll number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Create Your Account 🎉
          </h1>
          <p className="text-gray-600">Join us and start your learning adventure!</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 I am a...
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👋 Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📧 Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {formData.role === 'student' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎓 Roll Number
              </label>
              <input
                type="text"
                name="rollNo"
                value={formData.rollNo}
                onChange={handleChange}
                placeholder="Enter your roll number (e.g., 102)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your school-assigned roll number (numbers only)
              </p>
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔒 Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
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
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 6 characters
            </p>
          </div>

          {formData.role === 'parent' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👶 Child's Roll Number
              </label>
              <input
                type="text"
                name="childRollNo"
                value={formData.childRollNo}
                onChange={handleChange}
                placeholder="Enter your child's roll number (e.g., 102)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                This links your account to your child's progress
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Creating Account...' : 'Start Learning! 🚀'}
          </button>
        </form>

        {/* {formData.role === 'student' && (
          <>
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>
          </>
        )} */}

        <p className="mt-6 text-center text-gray-600 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-purple-600 hover:text-purple-800 font-semibold"
          >
            Sign in!
          </button>
        </p>
      </div>

      {showRollNoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                One More Step!
              </h2>
              <p className="text-gray-600">Please enter your school roll number</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎓 Roll Number
              </label>
              <input
                type="text"
                value={googleRollNo}
                onChange={(e) => setGoogleRollNo(e.target.value)}
                placeholder="Enter your roll number (e.g., 311523205055)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-gray-500">
                Numbers only - this helps us track your progress
              </p>
            </div>

            <button
              onClick={handleSaveRollNo}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Saving...' : 'Continue 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignupPage;
