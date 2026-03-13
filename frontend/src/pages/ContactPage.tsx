import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We\'ll get back to you soon! 🌟');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen py-12">
      {/* Header */}
      <section className="text-center py-16">
        <div className="text-8xl mb-6 animate-bounce">💌</div>
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
          Ask Us Anything!
        </h1>
        <p className="text-2xl text-purple-700 max-w-3xl mx-auto">
          We'd love to hear from you. Send us a message and we'll respond as soon as possible!
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          
          {/* Contact Form */}
          <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full p-4">
                <Send className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <h2 className="text-3xl font-bold text-purple-700">Send us a Message</h2>
                <p className="text-gray-600">We're here to help you! 🤗</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-purple-700 mb-2">
                  👋 Your Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-400 focus:outline-none text-lg"
                  placeholder="What's your name?"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-purple-700 mb-2">
                  📧 Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-400 focus:outline-none text-lg"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-purple-700 mb-2">
                  📝 What's this about?
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-400 focus:outline-none text-lg"
                  required
                >
                  <option value="">Choose a topic...</option>
                  <option value="general">General Question</option>
                  <option value="technical">Technical Support</option>
                  <option value="parent">Parent Inquiry</option>
                  <option value="teacher">Teacher/School Inquiry</option>
                  <option value="feedback">Feedback & Suggestions</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-semibold text-purple-700 mb-2">
                  💬 Your Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-400 focus:outline-none text-lg resize-none"
                  placeholder="Tell us what you need help with..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-4 px-8 rounded-2xl text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3"
              >
                <Send className="h-6 w-6" />
                <span>Send Message</span>
                <div className="text-2xl">🚀</div>
              </button>
            </form>
          </section>

          {/* Contact Info & Mascot */}
          <section className="space-y-8">
            
            {/* Mascot Section */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 shadow-xl text-center">
              <div className="text-9xl mb-4 animate-pulse">🦄</div>
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-purple-700 mb-2">Hi there!</h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  I'm Luna, your learning buddy! If you have any questions about our magical 
                  learning platform, don't hesitate to ask. We're here to help you succeed! ✨
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-xl">
              <h3 className="text-3xl font-bold text-green-700 mb-8 text-center">Get in Touch</h3>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
                  <div className="bg-blue-400 rounded-full p-3">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Email Us</h4>
                    <p className="text-gray-600">hello@smartlearning.com</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
                  <div className="bg-green-400 rounded-full p-3">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Call Us</h4>
                    <p className="text-gray-600">1-800-SMART-LEARN</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
                  <div className="bg-purple-400 rounded-full p-3">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Visit Us</h4>
                    <p className="text-gray-600">123 Learning Lane, Education City</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Teaser */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-8 shadow-xl text-center">
              <div className="text-6xl mb-4">❓</div>
              <h3 className="text-2xl font-bold text-pink-700 mb-4">Quick Questions?</h3>
              <p className="text-gray-700 mb-6">
                Check out our most frequently asked questions to get instant answers!
              </p>
              <button className="bg-gradient-to-r from-pink-400 to-purple-500 text-white py-3 px-6 rounded-full font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                View FAQ 📚
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;