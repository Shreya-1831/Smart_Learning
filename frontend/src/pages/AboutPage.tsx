import React from 'react';
import { Brain, Heart, Lightbulb, Target } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen py-12">
      {/* Header */}
      <section className="text-center py-16">
        <div className="text-8xl mb-6 animate-bounce">🦋</div>
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
          About Our Magic Learning World
        </h1>
        <p className="text-2xl text-purple-700 max-w-3xl mx-auto">
          Discover how we make learning an adventure for every child
        </p>
      </section>

      {/* Story Sections */}
      <div className="max-w-6xl mx-auto px-4 space-y-20">
        
        {/* What is Dyslexia */}
        <section className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-12 shadow-lg">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-blue-400 rounded-full p-6">
              <Brain className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-blue-700 text-center mb-8">What is Dyslexia? 🤔</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-lg text-gray-700 leading-relaxed space-y-4">
              <p>
                Dyslexia is like having a super creative brain that just learns differently! 
                It affects how people read, write, and spell words.
              </p>
              <p>
                Think of it this way: if most brains are like highways, dyslexic brains are like 
                scenic mountain roads - they might take a different path, but they often discover 
                amazing views along the way!
              </p>
              <div className="flex items-center space-x-2 text-blue-600">
                <Heart className="h-6 w-6" />
                <span className="font-semibold">Every brain is special and capable of amazing things!</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-9xl mb-4">🧠</div>
              <p className="text-purple-600 font-bold text-xl">Your brain is amazing!</p>
            </div>
          </div>
        </section>

        {/* Why Traditional Learning Doesn't Work */}
        <section className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-12 shadow-lg">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-orange-400 rounded-full p-6">
              <Lightbulb className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-orange-700 text-center mb-8">Why We're Different 🌟</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Traditional Learning</h3>
              <p className="text-gray-600">One size fits all approach</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">➡️</div>
              <div className="text-2xl font-bold text-orange-600">VS</div>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-purple-700 mb-2">Our Smart Platform</h3>
              <p className="text-gray-600">Adapts to YOUR unique learning style!</p>
            </div>
          </div>
        </section>

        {/* How Our Platform Works */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-12 shadow-lg">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-purple-400 rounded-full p-6">
              <Target className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-purple-700 text-center mb-8">How We Make Learning Fun 🎉</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🎯", title: "Smart AI", desc: "Our AI friend learns about you and creates perfect lessons just for you!" },
              { icon: "🎮", title: "Game-Like Fun", desc: "Every lesson is like playing your favorite video game!" },
              { icon: "🏆", title: "Earn Rewards", desc: "Collect stars, badges, and certificates as you learn!" },
              { icon: "❤️", title: "Emotional Support", desc: "We understand your feelings and cheer you on every step!" }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow text-center">
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Success Stories */}
        <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-12 shadow-lg">
          <h2 className="text-4xl font-bold text-green-700 text-center mb-12">Amazing Success Stories 🌈</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Emma, age 8", story: "Went from struggling with reading to loving books!", icon: "📖" },
              { name: "Alex, age 10", story: "Now writes amazing stories and poems!", icon: "✍️" },
              { name: "Sophie, age 12", story: "Became confident in spelling and won a school award!", icon: "🏅" }
            ].map((story, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="text-6xl mb-4">{story.icon}</div>
                <h3 className="text-xl font-bold text-purple-700 mb-2">{story.name}</h3>
                <p className="text-gray-600 leading-relaxed">{story.story}</p>
                <div className="mt-4 flex justify-center">
                  {"⭐".repeat(5)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;