import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Star } from 'lucide-react';

const HomePage = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && userData) {
      // Redirect based on role
      switch (userData.role) {
        case 'student':
          navigate('/student-dashboard');
          break;
        case 'parent':
          navigate('/parent-dashboard');
          break;
        case 'teacher':
          navigate('/teacher-dashboard');
          break;
        default:
          break;
      }
    }
  }, [currentUser, userData, navigate]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            {/* Floating mascot */}
            <div className="inline-block animate-bounce mb-8">
              <div className="bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full p-8 shadow-2xl">
                <div className="text-6xl">🦋</div>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-6 leading-tight">
              Learning Made Fun & Easy
            </h1>
            <h2 className="text-3xl md:text-4xl font-semibold text-purple-700 mb-8">
              for Dyslexic Children
            </h2>

            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed">
              Join thousands of children on a magical learning adventure! Our AI-powered platform makes reading, writing, and spelling feel like playing your favorite game.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
              <Link
                to="/login"
                className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-10 py-5 rounded-full text-2xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3"
              >
                <Star className="h-8 w-8" />
                <span>Start Learning!</span>
              </Link>

              <Link
                to="/about"
                className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-10 py-5 rounded-full text-2xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3"
              >
                <Heart className="h-8 w-8" />
                <span>Learn More</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 animate-pulse">
          <div className="text-4xl">📚</div>
        </div>
        <div className="absolute top-40 right-20 animate-pulse delay-1000">
          <div className="text-4xl">✨</div>
        </div>
        <div className="absolute bottom-20 left-1/4 animate-pulse delay-2000">
          <div className="text-4xl">🎨</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-purple-700 mb-4">Why Kids Love Learning With Us</h2>
            <div className="text-6xl mb-6">🌟</div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "🎮", title: "Game-Based Learning", desc: "Every lesson feels like playing your favorite game!" },
              { icon: "🤖", title: "AI-Powered Tutor", desc: "Smart technology that adapts to your learning style" },
              { icon: "🏆", title: "Earn Rewards", desc: "Collect stars, badges, and certificates as you learn" },
              { icon: "👨‍👩‍👧‍👦", title: "Family Support", desc: "Parents and teachers can track your amazing progress" }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-center">
                <div className="text-6xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-purple-700 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-400 via-blue-400 to-purple-500">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="text-8xl mb-6">🚀</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready for Your Learning Adventure?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Join thousands of children who are already having fun while learning!
          </p>
          <Link
            to="/login"
            className="bg-white text-purple-600 px-12 py-6 rounded-full text-2xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-3"
          >
            <span>Get Started Now</span>
            <div className="text-3xl">🎉</div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
