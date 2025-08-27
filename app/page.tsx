'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageCircle, 
  BookOpen, 
  TrendingUp, 
  Users, 
  Star, 
  ArrowRight, 
  Play, 
  CheckCircle,
  Zap,
  Globe,
  Award,
  ChevronRight,
  Sparkles,
  Mic,
  Volume2,
  Send
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { createVoiceRecognition } from '../lib/voice';

const features = [
  {
    icon: MessageCircle,
    title: 'Smart Q&A',
    description: 'Get instant answers with AI-powered explanations in your native language.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  {
    icon: BookOpen,
    title: 'Auto Quizzes',
    description: 'Practice with personalized quizzes generated from your learning progress.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Monitor your journey with detailed analytics and insights.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  {
    icon: Globe,
    title: 'Multilingual',
    description: 'Learn in 10+ Indian languages with seamless translation.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20'
  },
  {
    icon: Mic,
    title: 'Voice Input',
    description: 'Ask questions using voice in any supported language.',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20'
  },
  {
    icon: Volume2,
    title: 'Audio Answers',
    description: 'Listen to explanations with text-to-speech technology.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  }
];

const stats = [
  { icon: Users, value: '50K+', label: 'Active Students' },
  { icon: MessageCircle, value: '100K+', label: 'Questions Answered' },
  { icon: Globe, value: '10+', label: 'Languages' },
  { icon: Award, value: '98%', label: 'Success Rate' }
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Class 12 Student',
    content: 'VoiceMitra helped me understand complex physics concepts in Hindi. My grades improved significantly!',
    rating: 5,
    avatar: 'PS'
  },
  {
    name: 'Arjun Kumar',
    role: 'Engineering Student',
    content: 'The voice input feature is amazing. I can ask questions while studying and get instant explanations.',
    rating: 5,
    avatar: 'AK'
  },
  {
    name: 'Meera Patel',
    role: 'Medical Student',
    content: 'Finally, a platform that understands my native language. The AI explanations are incredibly detailed.',
    rating: 5,
    avatar: 'MP'
  }
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Hero search functionality
  const [heroQuestion, setHeroQuestion] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningStatus, setListeningStatus] = useState('');
  const [voiceError, setVoiceError] = useState('');

  // Create voice recognition instance
  const [voiceRecognition] = useState(() => 
    createVoiceRecognition(
      (status) => setListeningStatus(status),
      (error) => {
        setVoiceError(error);
        setError(error);
      }
    )
  );

  useEffect(() => {
    setIsVisible(true);
    
    // Create starfield
    const createStars = () => {
      const starfield = document.querySelector('.starfield');
      if (starfield) {
        for (let i = 0; i < 100; i++) {
          const star = document.createElement('div');
          star.className = 'star';
          star.style.left = Math.random() * 100 + '%';
          star.style.top = Math.random() * 100 + '%';
          star.style.width = Math.random() * 3 + 1 + 'px';
          star.style.height = star.style.width;
          star.style.animationDelay = Math.random() * 3 + 's';
          starfield.appendChild(star);
        }
      }
    };

    // Create moving dots
    const createMovingDots = () => {
      const dotsContainer = document.querySelector('.moving-dots');
      if (dotsContainer) {
        for (let i = 0; i < 20; i++) {
          const dot = document.createElement('div');
          dot.className = 'dot';
          dot.style.left = Math.random() * 100 + '%';
          dot.style.animationDelay = Math.random() * 20 + 's';
          dotsContainer.appendChild(dot);
        }
      }
    };

    createStars();
    createMovingDots();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (authMode === 'login') {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid credentials');
        } else {
          setShowAuthModal(false);
          // Redirect will happen automatically
        }
      } else {
        // Register
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            name,
          }),
        });

        if (response.ok) {
          // Auto-login after registration
          const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
          });

          if (!result?.error) {
            setShowAuthModal(false);
          }
        } else {
          const data = await response.json();
          setError(data.error || 'Registration failed');
        }
      }
    } catch (error) {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeroSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroQuestion.trim() || !session) return;

    setIsSearching(true);
    setError('');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: heroQuestion.trim(),
          language: 'en', // Default to English, can be enhanced with language detection
          isVoiceInput: false,
        }),
      });

      if (response.ok) {
        const newQA = await response.json();
        // Redirect to Q&A page with the new answer
        router.push(`/qa?newAnswer=${encodeURIComponent(JSON.stringify(newQA))}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get answer');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleHeroVoiceInput = async () => {
    if (!session) {
      setError('Please sign in to use voice features');
      return;
    }

    if (!voiceRecognition.isSupported()) {
      setError('Voice recognition is not supported in your browser. Please use Chrome, Edge, Safari, or Firefox for voice features.');
      return;
    }

    try {
      if (isListening) {
        voiceRecognition.stopListening();
        setIsListening(false);
        setListeningStatus('');
        setVoiceError('');
      } else {
        setIsListening(true);
        setError('');
        setVoiceError('');
        setListeningStatus('🔧 Requesting microphone access...');
        
        const transcript = await voiceRecognition.startListening('en');
        if (transcript && transcript.trim()) {
          setHeroQuestion(transcript);
          setListeningStatus('✅ Voice input complete!');
          setTimeout(() => setListeningStatus(''), 2000);
        } else {
          setError('No speech was detected. Please try again and speak clearly.');
        }
        setIsListening(false);
      }
    } catch (error: any) {
      console.error('Voice recognition error:', error);
      setVoiceError(error.message);
      setError(error.message);
      setIsListening(false);
      setListeningStatus('');
    }
  };

  return (
    <div className="min-h-screen space-bg">
      {/* Animated starfield background */}
      <div className="starfield"></div>
      <div className="moving-dots"></div>
      
      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* Common Navbar */}
      <Navbar 
        showAuthButtons={!session} 
        onAuthModalOpen={(mode) => {
          setAuthMode(mode);
          setShowAuthModal(true);
        }} 
      />

      {/* Hero Section */}
      <section className="relative pt-14 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden z-10 min-h-screen flex items-center">
        {/* Hero planet effect */}
        <div className="hero-planet-glow"></div>
        <div className="hero-planet"></div>
        <div className="hero-planet-surface"></div>
        
        <div className="max-w-7xl mx-auto hero-content w-full">
          <div className="text-center">
            <div className={`mb-8 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <Badge variant="secondary" className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-blue-500/20 text-blue-300 border-blue-400/30 backdrop-blur-sm rounded-full">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                AI-Powered Multilingual Learning
              </Badge>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight max-w-4xl mx-auto px-2">
                Learn Smarter. Learn Faster. In Your Own Language.
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto mb-6 sm:mb-8 lg:mb-10 leading-relaxed px-4">
                Break free from language barriers—experience AI-driven learning that speaks your way. 
              </p>
            </div>

            <div className={`flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6 mb-8 sm:mb-12 md:mb-16 hero-input-container ${isVisible ? 'animate-slide-up' : 'opacity-0'} px-4`} style={{animationDelay: '0.2s'}}>
              {listeningStatus && (
                <div className="text-center mb-2 sm:mb-4">
                  <div className={`inline-flex items-center space-x-3 px-4 py-3 rounded-lg border backdrop-blur-sm ${
                    listeningStatus.includes('error') || listeningStatus.includes('Error') || listeningStatus.includes('❌')
                      ? 'bg-red-500/10 text-red-300 border-red-400/30'
                      : listeningStatus.includes('Speaking') || listeningStatus.includes('speak') || listeningStatus.includes('🗣️')
                      ? 'bg-blue-500/10 text-blue-300 border-blue-400/30'
                      : listeningStatus.includes('✅') || listeningStatus.includes('complete')
                      ? 'bg-green-500/10 text-green-300 border-green-400/30'
                      : 'bg-blue-500/10 text-blue-300 border-blue-400/30'
                  }`}>
                    {(listeningStatus.includes('Listening') || listeningStatus.includes('🎤') || listeningStatus.includes('🔊') || listeningStatus.includes('🗣️')) && (
                      <div className="listening-dots">
                        <div className="listening-dot"></div>
                        <div className="listening-dot"></div>
                        <div className="listening-dot"></div>
                      </div>
                    )}
                    {(listeningStatus.includes('Processing') || listeningStatus.includes('⏳') || listeningStatus.includes('✨')) && (
                      <div className="spinner-small"></div>
                    )}
                    {(listeningStatus.includes('recognized') || listeningStatus.includes('✅') || listeningStatus.includes('complete')) && (
                      <div className="success-check">✓</div>
                    )}
                    <span className="text-sm font-medium leading-relaxed">{listeningStatus}</span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleHeroSearch} className="flex max-w-xl md:max-w-2xl w-full bg-gray-900/90 backdrop-blur-xl rounded-xl md:rounded-2xl p-2 sm:p-3 border border-blue-400/30 shadow-2xl shadow-blue-500/20">
                <Input
                  placeholder={session ? "Ask me anything in Hindi, Tamil, Bengali..." : "Sign in to start asking questions..."}
                  value={heroQuestion}
                  onChange={(e) => setHeroQuestion(e.target.value)}
                  className="flex-1 bg-transparent border-0 text-white placeholder-white/50 text-xs sm:text-sm md:text-base lg:text-lg h-8 sm:h-10 md:h-12 focus:ring-0 focus:outline-none"
                  disabled={!session || isSearching}
                />
                <div className="flex items-center space-x-1 sm:space-x-2 ml-1 sm:ml-2 flex-shrink-0">
                  <Button 
                    type="button"
                    size="sm" 
                    variant="ghost" 
                    onClick={handleHeroVoiceInput}
                    className={`relative p-2 transition-all duration-300 ${
                      isListening 
                        ? 'voice-button-listening text-white listening-wave animate-pulse' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    disabled={!session || isSearching}
                    title={
                      !session 
                        ? "Sign in to use voice features"
                        : isListening 
                        ? 'Click to stop listening (or wait for automatic stop)' 
                        : 'Click to start voice input - speak your full question clearly'
                    }
                  >
                    <Mic className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${isListening ? 'text-white' : ''}`} />
                    {isListening && (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping animation-delay-500"></div>
                      </>
                    )}
                  </Button>
                  <Button 
                    type="submit"
                    size="sm" 
                    className="btn-primary px-2 sm:px-3 md:px-4"
                    disabled={!session || !heroQuestion.trim() || isSearching}
                  >
                    {isSearching ? (
                      <div className="spinner mr-2" />
                    ) : (
                      <Send className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    )}
                  </Button>
                </div>
              </form>

              
              
              {error && (
                <div className="text-red-400 text-xs sm:text-sm bg-red-500/10 p-2 sm:p-3 rounded-lg animate-slide-in max-w-xl md:max-w-2xl w-full">
                  {error}
                  {voiceError && (
                    <div className="mt-1 sm:mt-2 text-xs">
                      <strong>Voice Help:</strong> Make sure your microphone is connected and you've granted permission. Try refreshing the page if issues persist.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 relative z-10 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 px-4">
              Solving Real Educational Challenges
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto px-4">
              Breaking down language barriers that limit rural and vernacular students from effective learning
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="card-glow border-white/10 animate-slide-up"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <CardHeader className="text-center">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${feature.bgColor} flex items-center justify-center mb-3 sm:mb-4 mx-auto backdrop-blur-sm`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-base sm:text-lg md:text-xl mb-2 text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-white/70 text-center leading-relaxed text-xs sm:text-sm md:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Problem Statement */}
          <div className="mt-8 sm:mt-12 md:mt-16 lg:mt-20 text-center">
            <Card className="card-glow border-white/20 bg-gradient-to-r from-red-500/10 to-orange-500/10 max-w-4xl mx-auto">
              <CardContent className="pt-4 sm:pt-6 md:pt-8 px-4 sm:px-6">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">The Problem We're Solving</h3>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 mb-4 sm:mb-6 leading-relaxed">
                  English-only educational content creates barriers for millions of rural and vernacular students, 
                  limiting their access to quality education and hindering their academic progress.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6 md:mt-8">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400 mb-1 sm:mb-2">70%</div>
                    <p className="text-white/70 text-xs sm:text-sm">Students struggle with English-only content</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400 mb-1 sm:mb-2">10+</div>
                    <p className="text-white/70 text-xs sm:text-sm">Languages supported for learning</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 mb-1 sm:mb-2">95%</div>
                    <p className="text-white/70 text-xs sm:text-sm">Accuracy in native language explanations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 sm:py-12 md:py-16 border-t border-white/10 z-10 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <Link href="/" className="flex items-center space-x-3 flex-shrink-0 py-2">
                            <img 
                              src="/logo.png" 
                              alt="VoiceMitra Logo" 
                              className="h-12 sm:h-14 md:h-16 w-auto object-contain max-w-[140px] sm:max-w-[160px] md:max-w-[180px] lg:max-w-[200px]"
                            />
                          </Link>
              </div>
              <p className="text-white/60 mb-4 sm:mb-6 max-w-md text-xs sm:text-sm md:text-base">
                Empowering students with AI-powered multilingual education. 
                Learn better, practice more, achieve faster.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base md:text-lg text-white">Features</h3>
              <ul className="space-y-1 sm:space-y-2 text-white/60 text-xs sm:text-sm md:text-base">
                <li><Link href="/qa" className="hover:text-blue-400 transition-colors">Q&A System</Link></li>
                <li><Link href="/quiz" className="hover:text-blue-400 transition-colors">Auto Quizzes</Link></li>
                <li><Link href="/dashboard" className="hover:text-blue-400 transition-colors">Progress Tracking</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Voice Learning</Link></li>
              </ul>
            </div>
            
          </div>
          <div className="border-t border-white/10 mt-6 sm:mt-8 md:mt-12 pt-4 sm:pt-6 md:pt-8 text-center text-white/60 text-xs sm:text-sm">
            <p>&copy; 2025 VoiceMitra. All rights reserved. Made with ❤️ for students worldwide.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
          <form onSubmit={handleAuth}>
            <Card className="w-full max-w-sm sm:max-w-md card-glow border-white/20 animate-scale-in">
              <CardHeader className="text-center">
                <CardTitle className="text-lg sm:text-xl md:text-2xl text-white">
                  {authMode === 'login' ? 'Welcome Back' : 'Join VoiceMitra'}
                </CardTitle>
                <CardDescription className="text-white/70 text-xs sm:text-sm md:text-base">
                  {authMode === 'login' 
                    ? 'Sign in to continue your learning journey' 
                    : 'Create your account to start learning'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                {error && (
                  <div className="text-red-400 text-xs sm:text-sm text-center bg-red-500/10 p-2 rounded">
                    {error}
                  </div>
                )}
                {authMode === 'signup' && (
                  <Input 
                    placeholder="Full Name" 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark"
                    required
                  />
                )}
                <Input 
                  placeholder="Email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark"
                  required
                />
                <Input 
                  placeholder="Password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark"
                  required
                />
                <Button 
                  type="submit" 
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="spinner mr-2" />
                  ) : null}
                  {isLoading 
                    ? (authMode === 'login' ? 'Signing In...' : 'Creating Account...') 
                    : (authMode === 'login' ? 'Sign In' : 'Create Account')
                  }
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                      setError('');
                    }}
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    {authMode === 'login' 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAuthModal(false);
                    setError('');
                  }}
                  className="w-full text-white/60 hover:text-white text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      )}
    </div>
  );
}