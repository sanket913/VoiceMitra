'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  BookOpen, 
  MessageCircle, 
  TrendingUp, 
  Calendar, 
  Award, 
  Target, 
  Clock,
  BarChart3,
  ArrowLeft,
  Settings,
  User,
  Mic,
  Volume2,
  Sparkles,
  Loader2,
  RefreshCw,
  Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { createTextToSpeech } from '@/lib/voice';

interface DashboardStats {
  totalQuestions: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  studyTimeHours: number;
  currentStreak: number;
  monthlyGoal: number;
  streakProgress: number;
}

interface RecentActivity {
  questions: Array<{
    _id: string;
    question: string;
    subject?: string;
    language: string;
    createdAt: string;
  }>;
  quizzes: Array<{
    _id: string;
    title: string;
    subject: string;
    score: number;
    language: string;
    completedAt: string;
  }>;
}

interface ChartData {
  subjects: Array<{
    _id: string;
    count: number;
  }>;
  languages: Array<{
    _id: string;
    count: number;
  }>;
  weeklyActivity: Array<{
    day: any;
    date: string;
    questions: number;
    quizzes: number;
  }>;
}

const languageNames: { [key: string]: string } = {
  'en': 'English',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'gu': 'Gujarati',
  'mr': 'Marathi',
  'pa': 'Punjabi'
};

const subjectColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Add missing state for TTS functionality
  const [isPlaying, setIsPlaying] = useState(false);
  const [listeningStatus, setListeningStatus] = useState('');

  // Create text-to-speech instance
  const [textToSpeech] = useState(() => 
    createTextToSpeech(
      (status) => setListeningStatus(status)
    )
  );

  // Cleanup TTS on component unmount or page refresh/exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (textToSpeech.isSpeaking()) {
        textToSpeech.stop();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && textToSpeech.isSpeaking()) {
        textToSpeech.stop();
        setIsPlaying(false);
        setListeningStatus('');
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      // Stop any ongoing TTS
      if (textToSpeech.isSpeaking()) {
        textToSpeech.stop();
      }
      setIsPlaying(false);
      setListeningStatus('');
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [textToSpeech]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }
    
    loadDashboardData();
  }, [session, status, router, selectedPeriod]);

  const loadDashboardData = async () => {
    if (!session) return;
    
    try {
      setError('');
      const response = await fetch(`/api/dashboard/stats?period=${selectedPeriod}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentActivity(data.recentActivity);
        setChartData(data.charts);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      setError('Something went wrong loading your data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const handlePlayText = async (text: string, language: string) => {
    if (!textToSpeech.isSupported()) {
      setError('Text-to-speech is not supported in your browser. Please use Chrome, Edge, or Safari for voice features.');
      return;
    }

    try {
      if (isPlaying) {
        textToSpeech.stop();
        setIsPlaying(false);
        setListeningStatus('');
      } else {
        setIsPlaying(true);
        
        console.log(`Playing dashboard text in ${language}:`, text.substring(0, 50) + '...');
        await textToSpeech.speak(text, language);
        setIsPlaying(false);
      }
    } catch (error: any) {
      console.error('Dashboard TTS Error:', error);
      setError(`Text-to-speech error for ${language}: ${error.message}`);
      setIsPlaying(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWeeklyChartData = () => {
    if (!chartData?.weeklyActivity) return [];
    
    // Return the weekly activity data directly from the API
    return chartData.weeklyActivity.map(day => ({
      day: day.day,
      questions: day.questions || 0,
      quizzes: day.quizzes || 0
    }));
  };

  const getLanguageDistribution = () => {
    if (!chartData?.languages) return [];
    
    return chartData.languages.map((lang, index) => ({
      name: languageNames[lang._id] || lang._id,
      value: lang.count,
      color: subjectColors[index % subjectColors.length]
    }));
  };

  const getSubjectAccuracy = () => {
    if (!chartData?.subjects) return [];
    
    return chartData.subjects.map(subject => ({
      subject: subject._id || 'General',
      questions: subject.count,
      accuracy: Math.floor(Math.random() * 20) + 75 // This would come from quiz results in real implementation
    }));
  };

  // Show loading if session is loading
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen space-bg flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4 mx-auto" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen space-bg">
      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* Common Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <div className="flex mt-20 justify-start w-full sm:w-auto">
            <Link href="/" className="flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm sm:text-base">Back</span>
            </Link>
            </div>
            
          </div>
          <div className="flex items-center mt-20 space-x-3 sm:space-x-4">
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-28 sm:w-32 bg-white/10 border-white/20 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="week" className="text-white hover:bg-white/10">This Week</SelectItem>
                <SelectItem value="month" className="text-white hover:bg-white/10">This Month</SelectItem>
                <SelectItem value="year" className="text-white hover:bg-white/10">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 text-red-400 text-xs sm:text-sm bg-red-500/10 p-2 sm:p-3 rounded-lg animate-slide-in">
            {error}
          </div>
        )}

        {/* User Profile Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Card className="card-glow border-white/20 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-slide-up">
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 border-4 border-white/20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg sm:text-xl md:text-2xl font-bold">
                    {getUserInitials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-white">
                    Welcome back, {session.user.name}!
                  </h1>
                  <p className="text-white/70 mb-3 sm:mb-4 text-xs sm:text-sm md:text-base">Keep up the great learning momentum!</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        {stats?.totalQuestions || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-white/70">Questions Asked</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        {stats?.completedQuizzes || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-white/70">Quizzes Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        {stats?.averageScore || 0}%
                      </div>
                      <div className="text-xs sm:text-sm text-white/70">Average Score</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-96 bg-white/10 border-white/20 h-auto p-1">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="progress" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm">Progress</TabsTrigger>
            <TabsTrigger value="subjects" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm">Subjects</TabsTrigger>
            <TabsTrigger value="activity" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.1s'}}>
                <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-white">{stats?.totalQuestions || 0}</p>
                      <p className="text-xs sm:text-sm text-white/70">Total Questions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.2s'}}>
                <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-white">{stats?.completedQuizzes || 0}</p>
                      <p className="text-xs sm:text-sm text-white/70">Quizzes Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.3s'}}>
                <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-white">{stats?.averageScore || 0}%</p>
                      <p className="text-xs sm:text-sm text-white/70">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.4s'}}>
                <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Target className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-white">{stats?.currentStreak || 0}</p>
                      <p className="text-xs sm:text-sm text-white/70">Day Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Chart */}
            <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.5s'}}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white text-base sm:text-lg md:text-xl">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Weekly Activity</span>
                </CardTitle>
                <CardDescription className="text-white/70 text-xs sm:text-sm">
                  Questions asked and quizzes completed in the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {getWeeklyChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getWeeklyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }} 
                    />
                    <Bar dataKey="questions" fill="#3B82F6" name="Questions" />
                    <Bar dataKey="quizzes" fill="#10B981" name="Quizzes" />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/70 text-sm">No activity data yet</p>
                    <p className="text-white/50 text-xs">Start asking questions or taking quizzes to see your weekly progress!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.6s'}}>
              <CardHeader>
                <CardTitle className="text-white text-base sm:text-lg md:text-xl">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                  {recentActivity?.questions?.slice(0, 3).map((question, index) => (
                    <div key={question._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 md:p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 hover-lift border border-white/10 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <div className="p-2 rounded-full bg-blue-500/20">
                          <MessageCircle className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-xs sm:text-sm md:text-base">
                            Asked: {question.question.length > 50 ? question.question.substring(0, 50) + '...' : question.question}
                          </p>
                          <p className="text-xs sm:text-sm text-white/70">
                            {question.subject || 'General'} • {languageNames[question.language] || question.language}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-white/50">{formatDate(question.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  
                  {recentActivity?.quizzes?.slice(0, 2).map((quiz, index) => (
                    <div key={quiz._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 md:p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 hover-lift border border-white/10 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <div className="p-2 rounded-full bg-green-500/20">
                          <BookOpen className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-xs sm:text-sm md:text-base">
                            Completed: {quiz.title}
                          </p>
                          <p className="text-xs sm:text-sm text-white/70">
                            Score: {quiz.score}% • {quiz.subject}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                          {languageNames[quiz.language] || quiz.language}
                        </Badge>
                        <p className="text-xs text-white/50 mt-1">{formatDate(quiz.completedAt)}</p>
                      </div>
                    </div>
                  ))}

                  {(!recentActivity?.questions?.length && !recentActivity?.quizzes?.length) && (
                    <div className="text-center py-6 sm:py-8">
                      <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white/40 mx-auto mb-3 sm:mb-4" />
                      <p className="text-white/70 text-sm sm:text-base">No recent activity</p>
                      <p className="text-white/50 text-xs sm:text-sm">Start asking questions or taking quizzes!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* Learning Streak */}
              <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.1s'}}>
                <CardHeader>
                  <CardTitle className="text-white text-base sm:text-lg md:text-xl">Learning Streak</CardTitle>
                  <CardDescription className="text-white/70 text-xs sm:text-sm md:text-base">Keep up your daily learning habit!</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 mb-2">
                      {stats?.currentStreak || 0}
                    </div>
                    <p className="text-sm sm:text-base md:text-lg text-white/70 mb-3 sm:mb-4">Days in a row</p>
                    <Progress value={stats?.streakProgress || 0} className="mb-2 progress-glow" />
                    <p className="text-xs sm:text-sm text-white/50">
                      {stats?.monthlyGoal ? `${Math.max(0, stats.monthlyGoal - (stats.currentStreak || 0))} more days to reach your monthly goal!` : 'Set a monthly goal to track progress'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Language Usage */}
              <Card className="card-glow border-white/20 animate-slide-up" style={{animationDelay: '0.2s'}}>
                <CardHeader>
                  <CardTitle className="text-white text-base sm:text-lg md:text-xl">Language Distribution</CardTitle>
                  <CardDescription className="text-white/70 text-xs sm:text-sm md:text-base">Questions asked by language</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {getLanguageDistribution().length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={getLanguageDistribution()}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getLanguageDistribution().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(0,0,0,0.8)', 
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px',
                              color: 'white'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4">
                        {getLanguageDistribution().map((lang, index) => (
                          <div key={index} className="flex items-center space-x-1 text-xs sm:text-sm">
                            <div
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                              style={{ backgroundColor: lang.color }}
                            />
                            <span className="text-white/70">{lang.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <Globe className="h-10 w-10 sm:h-12 sm:w-12 text-white/40 mx-auto mb-3 sm:mb-4" />
                      <p className="text-white/70 text-sm sm:text-base">No language data yet</p>
                      <p className="text-white/50 text-xs sm:text-sm">Start asking questions to see your language usage!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Progress Chart */}
            <Card className="card-glow border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-base sm:text-lg md:text-xl">Learning Progress</CardTitle>
                <CardDescription className="text-white/70 text-xs sm:text-sm md:text-base">Your learning journey over time</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {getWeeklyChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={getWeeklyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="questions" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/70 text-sm">No progress data yet</p>
                    <p className="text-white/50 text-xs">Your learning progress will appear here as you use the platform!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {getSubjectAccuracy().map((subject, index) => (
                <Card key={index} className="card-glow border-white/20 animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg text-white">{subject.subject}</CardTitle>
                    <CardDescription className="text-white/70 text-xs sm:text-sm">{subject.questions} questions asked</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-white/80">Engagement</span>
                        <span className="text-xs sm:text-sm font-bold text-white">{subject.accuracy}%</span>
                      </div>
                      <Progress value={subject.accuracy} className="progress-glow" />
                      <div className="flex justify-between text-xs sm:text-sm text-white/60">
                        <span>Questions: {subject.questions}</span>
                        <span>
                          {subject.accuracy >= 90 ? 'Excellent' : 
                           subject.accuracy >= 80 ? 'Good' : 
                           subject.accuracy >= 70 ? 'Fair' : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {getSubjectAccuracy().length === 0 && (
                <div className="col-span-full">
                  <Card className="card-glow border-white/20 text-center py-8 sm:py-12">
                    <CardContent>
                      <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-white/40 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No subjects yet</h3>
                      <p className="text-white/70 text-sm sm:text-base">Start asking questions to see your subject breakdown!</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 sm:space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">All Recent Activity</h3>
              
              {/* All Questions */}
              {recentActivity?.questions && recentActivity.questions.length > 0 && (
                <Card className="card-glow border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white text-base sm:text-lg">Recent Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="space-y-3">
                      {recentActivity.questions.map((question) => (
                        <div key={question._id} className="flex flex-col sm:flex-row items-start justify-between p-2 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 gap-2 sm:gap-0">
                          <div className="flex-1">
                            <p className="text-white text-xs sm:text-sm font-medium mb-1">
                              {question.question}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-white/60">
                              <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                                {languageNames[question.language] || question.language}
                              </Badge>
                              {question.subject && (
                                <span>• {question.subject}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-white/50 sm:ml-4">
                            {formatDate(question.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Quizzes */}
              {recentActivity?.quizzes && recentActivity.quizzes.length > 0 && (
                <Card className="card-glow border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white text-base sm:text-lg">Recent Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="space-y-3">
                      {recentActivity.quizzes.map((quiz) => (
                        <div key={quiz._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 gap-2 sm:gap-0">
                          <div className="flex-1">
                            <p className="text-white text-xs sm:text-sm font-medium mb-1">
                              {quiz.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-white/60">
                              <span>Score: {quiz.score}%</span>
                              <span>• {quiz.subject}</span>
                              <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                                {languageNames[quiz.language] || quiz.language}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-white/50 sm:ml-4">
                            {formatDate(quiz.completedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {(!recentActivity?.questions?.length && !recentActivity?.quizzes?.length) && (
                <Card className="card-glow border-white/20 text-center py-8 sm:py-12">
                  <CardContent>
                    <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-white/40 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No activity yet</h3>
                    <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base">Start your learning journey by asking questions or taking quizzes!</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                      <Link href="/qa">
                        <Button className="btn-primary">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Ask Questions
                        </Button>
                      </Link>
                      <Link href="/quiz">
                        <Button className="btn-secondary">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Take Quiz
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}