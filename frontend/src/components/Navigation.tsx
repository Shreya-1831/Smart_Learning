import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Info, Phone, LogIn, Brain, User, Settings, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, signOut: authSignOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await authSignOut();
      setShowDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/about', label: 'About', icon: Info },
    { path: '/contact', label: 'Contact', icon: Phone },
  ];

  const getDashboardPath = () => {
    if (!userData) return '/';
    if (userData.role === 'student') return '/student-dashboard';
    if (userData.role === 'parent') return '/parent-dashboard';
    return '/teacher-dashboard';
  };

  return (
    <nav className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-white rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold leading-tight">Smart Learning</h1>
              <p className="text-sm opacity-90">For Dyslexic Children</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-2 items-center">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                  location.pathname === path
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            ))}

            {/* Auth Buttons */}
            {!currentUser && (
              <>
                <Link
                  to="/login"
                  className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                    location.pathname === '/login'
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  <LogIn className="h-5 w-5" />
                  <span className="hidden sm:block">Login</span>
                </Link>
                <Link
                  to="/signup"
                  className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                    location.pathname === '/signup'
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="hidden sm:block">Sign Up</span>
                </Link>
              </>
            )}

            {/* Profile Dropdown */}
            {currentUser && userData && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 bg-white text-purple-600 shadow-lg"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block">Profile</span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                      <p className="text-sm text-gray-600">Signed in as</p>
                      <p className="font-semibold text-purple-700 truncate">{userData.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{userData.role}</p>
                    </div>
                    <div className="py-2">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center space-x-3 text-gray-700"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate(getDashboardPath());
                        }}
                      >
                        <Settings className="h-5 w-5" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center space-x-3 text-red-600"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;