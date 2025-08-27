'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  Volume2, 
  VolumeX,
  Search,
  Filter,
  ArrowLeft,
  Sparkles,
  Globe,
  Clock,
  User,
  RefreshCw,
  Loader2,
  BookOpen,
  Brain,
  Zap,
  Trash2,
  MoreVertical,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { createVoiceRecognition, createTextToSpeech } from '../../lib/voice';

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
];

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

interface QAItem {
  _id: string;
  question: string;
  answer: string;
  language: string;
  subject?: string;
  isVoiceInput: boolean;
  createdAt: string;
}

export default function QAPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Question input state
  const [question, setQuestion] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Voice functionality state
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [listeningStatus, setListeningStatus] = useState('');
  const [voiceError, setVoiceError] = useState('');
  
  // Q&A history state
  const [qaHistory, setQaHistory] = useState<QAItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<QAItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI state
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ask');
  
  // Delete functionality state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  
  // Refs
  const questionInputRef = useRef<HTMLInputElement>(null);
  const latestAnswerRef = useRef<HTMLDivElement>(null);

  // Create voice recognition and TTS instances
  const [voiceRecognition] = useState(() => 
    createVoiceRecognition(
      (status) => setListeningStatus(status),
      (error) => {
        setVoiceError(error);
        setError(error);
      }
    )
  );

  const [textToSpeech] = useState(() => 
    createTextToSpeech(
      (status) => setListeningStatus(status)
    )
  );

  // Cleanup TTS and voice recognition on component unmount or page refresh/exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (textToSpeech.isSpeaking()) {
        textToSpeech.stop();
      }
      if (voiceRecognition.getIsListening()) {
        voiceRecognition.stopListening();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (textToSpeech.isSpeaking()) {
          textToSpeech.stop();
          setIsPlaying(null);
          setListeningStatus('');
        }
        if (voiceRecognition.getIsListening()) {
          voiceRecognition.stopListening();
          setIsListening(false);
          setListeningStatus('');
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      // Stop any ongoing TTS or voice recognition
      if (textToSpeech.isSpeaking()) {
        textToSpeech.stop();
      }
      if (voiceRecognition.getIsListening()) {
        voiceRecognition.stopListening();
      }
      setIsPlaying(null);
      setIsListening(false);
      setListeningStatus('');
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [textToSpeech, voiceRecognition]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/');
      return;
    }
    
    loadQAHistory();
    
    // Check for new answer from URL params (from hero search)
    const newAnswerParam = searchParams.get('newAnswer');
    if (newAnswerParam) {
      try {
        const newQA = JSON.parse(decodeURIComponent(newAnswerParam));
        setQaHistory(prev => [newQA, ...prev]);
        setActiveTab('history');
        // Scroll to the latest answer after a short delay
        setTimeout(() => {
          latestAnswerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (error) {
        console.error('Error parsing new answer:', error);
      }
    }
  }, [session, status, router, searchParams]);

  // Filter history based on search and language
  useEffect(() => {
    let filtered = qaHistory;
    
    if (searchTerm) {
      filtered = filtered.filter(qa => 
        qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qa.answer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(qa => qa.language === filterLanguage);
    }
    
    setFilteredHistory(filtered);
  }, [qaHistory, searchTerm, filterLanguage]);

  const loadQAHistory = async () => {
    if (!session) return;
    
    try {
      setError('');
      const response = await fetch('/api/questions?limit=50');
      
      if (response.ok) {
        const data = await response.json();
        setQaHistory(data.questions || []);
      } else {
        setError('Failed to load Q&A history');
      }
    } catch (error) {
      console.error('Q&A history error:', error);
      setError('Something went wrong loading your history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshHistory = async () => {
    setRefreshing(true);
    await loadQAHistory();
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          language: selectedLanguage,
          isVoiceInput: false,
        }),
      });

      if (response.ok) {
        const newQA = await response.json();
        setQaHistory(prev => [newQA, ...prev]);
        setQuestion('');
        setActiveTab('history');
        
        // Scroll to the new answer after a short delay
        setTimeout(() => {
          latestAnswerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get answer');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceInput = async () => {
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
        
        const transcript = await voiceRecognition.startListening(selectedLanguage);
        if (transcript && transcript.trim()) {
          setQuestion(transcript);
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

  const handlePlayAnswer = async (qaId: string, text: string, language: string) => {
    if (!textToSpeech.isSupported()) {
      setError('Text-to-speech is not supported in your browser. Please use Chrome, Edge, or Safari for voice features.');
      return;
    }

    try {
      if (isPlaying === qaId) {
        textToSpeech.stop();
        setIsPlaying(null);
        setListeningStatus('');
      } else {
        // Stop any currently playing audio
        if (isPlaying) {
          textToSpeech.stop();
        }
        
        setIsPlaying(qaId);
        
        console.log(`Playing answer in ${language}:`, text.substring(0, 50) + '...');
        await textToSpeech.speak(text, language);
        setIsPlaying(null);
      }
    } catch (error: any) {
      console.error('TTS Error:', error);
      setError(`Text-to-speech error for ${language}: ${error.message}`);
      setIsPlaying(null);
    }
  };

  // Delete functionality
  const toggleQuestionSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAllQuestions = () => {
    if (selectedQuestions.size === filteredHistory.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredHistory.map(qa => qa._id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestions.size === 0) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/questions/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestions),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Remove deleted questions from local state
        setQaHistory(prev => prev.filter(qa => !selectedQuestions.has(qa._id)));
        setSelectedQuestions(new Set());
        setIsSelectionMode(false);
        setDeleteConfirmOpen(false);
        
        // Show success message briefly
        setError('');
        const successMessage = result.message || `Deleted ${selectedQuestions.size} question${selectedQuestions.size !== 1 ? 's' : ''}`;
        // You could add a toast notification here instead
        console.log(successMessage);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete questions');
      }
    } catch (error) {
      setError('Something went wrong while deleting questions');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/questions/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleteAll: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Clear all questions from local state
        setQaHistory([]);
        setSelectedQuestions(new Set());
        setIsSelectionMode(false);
        setDeleteAllConfirmOpen(false);
        
        // Show success message
        setError('');
        console.log(result.message || 'All questions deleted successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete all questions');
      }
    } catch (error) {
      setError('Something went wrong while deleting all questions');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (questionId: string) => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/questions/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionIds: [questionId],
        }),
      });

      if (response.ok) {
        // Remove deleted question from local state
        setQaHistory(prev => prev.filter(qa => qa._id !== questionId));
        setError('');
        console.log('Question deleted successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete question');
      }
    } catch (error) {
      setError('Something went wrong while deleting the question');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading if session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen space-bg flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4 mx-auto" />
          <p>Loading...</p>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-16 sm:mt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={refreshHistory}
              disabled={refreshing}
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 sm:mb-6 text-red-400 text-xs sm:text-sm bg-red-500/10 p-2 sm:p-3 rounded-lg animate-slide-in">
            {error}
            {voiceError && (
              <div className="mt-1 sm:mt-2 text-xs">
                <strong>Voice Help:</strong> Make sure your microphone is connected and you've granted permission. Try refreshing the page if issues persist.
              </div>
            )}
          </div>
        )}

        {/* Listening Status */}
        {listeningStatus && (
          <div className="mb-4 sm:mb-6 text-center">
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
              {(listeningStatus.includes('Speaking') || listeningStatus.includes('🗣️')) && (
                <div className="speaking-wave">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              )}
              {(listeningStatus.includes('recognized') || listeningStatus.includes('✅') || listeningStatus.includes('complete')) && (
                <div className="success-check">✓</div>
              )}
              <span className="text-sm font-medium leading-relaxed">{listeningStatus}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-96 bg-white/10 border-white/20 h-auto p-1">
            <TabsTrigger value="ask" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              Ask Question
            </TabsTrigger>
            <TabsTrigger value="history" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-2" />
              History ({qaHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Ask Question Tab */}
          <TabsContent value="ask" className="space-y-4 sm:space-y-6">
            <Card className="card-glow border-white/20 animate-slide-up">
              <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl md:text-3xl text-white mb-3 sm:mb-4 flex items-center justify-center">
                  <Brain className="h-6 w-6 sm:h-8 sm:w-8 mr-3 text-blue-400" />
                  Ask Your Question
                </CardTitle>
                <CardDescription className="text-white/70 text-sm sm:text-base md:text-lg">
                  Get instant AI-powered answers in your preferred language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                {/* Language Selection */}
                <div>
                  <label className="text-white mb-2 block text-sm sm:text-base font-medium">
                    <Globe className="h-4 w-4 inline mr-2" />
                    Select Language
                  </label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                          {lang.native} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Input */}
                <form onSubmit={handleSubmitQuestion} className="space-y-4">
                  <div>
                    <label className="text-white mb-2 block text-sm sm:text-base font-medium">
                      Your Question
                    </label>
                    <div className="flex bg-gray-900/90 backdrop-blur-xl rounded-xl p-2 sm:p-3 border border-blue-400/30 shadow-2xl shadow-blue-500/20">
                      <Input
                        ref={questionInputRef}
                        placeholder="Ask me anything in your preferred language..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="flex-1 bg-transparent border-0 text-white placeholder-white/50 text-sm sm:text-base h-10 sm:h-12 focus:ring-0 focus:outline-none"
                        disabled={isSubmitting}
                      />
                      <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                        <Button 
                          type="button"
                          size="sm" 
                          variant="ghost" 
                          onClick={handleVoiceInput}
                          className={`relative p-2 transition-all duration-300 ${
                            isListening 
                              ? 'voice-button-listening text-white listening-wave animate-pulse' 
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                          disabled={isSubmitting}
                          title={
                            isListening 
                              ? 'Click to stop listening (or wait for automatic stop)' 
                              : 'Click to start voice input - speak your full question clearly'
                          }
                        >
                          <Mic className={`h-4 w-4 sm:h-5 sm:w-5 ${isListening ? 'text-white' : ''}`} />
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
                          className="btn-primary px-3 sm:px-4"
                          disabled={!question.trim() || isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="spinner mr-2" />
                          ) : (
                            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>

                
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 sm:space-y-6">
            {/* Search and Filter */}
            <Card className="card-glow border-white/20">
              <CardContent className="pt-6 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        placeholder="Search your questions and answers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                      <SelectTrigger className="input-dark">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/20">
                        <SelectItem value="all" className="text-white hover:bg-white/10">All Languages</SelectItem>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                            {lang.native}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Delete Controls */}
                {filteredHistory.length > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => {
                          setIsSelectionMode(!isSelectionMode);
                          setSelectedQuestions(new Set());
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                      >
                        {isSelectionMode ? (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Cancel Selection
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Select Questions
                          </>
                        )}
                      </Button>
                      
                      {isSelectionMode && (
                        <Button
                          onClick={selectAllQuestions}
                          variant="ghost"
                          size="sm"
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          {selectedQuestions.size === filteredHistory.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isSelectionMode && selectedQuestions.size > 0 && (
                        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Selected ({selectedQuestions.size})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-white/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white flex items-center">
                                <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                                Delete Selected Questions
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-white/70">
                                Are you sure you want to delete {selectedQuestions.size} selected question{selectedQuestions.size !== 1 ? 's' : ''}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteSelected}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
                                  </>
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      
                      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-white/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white flex items-center">
                              <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                              Delete All Questions
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-white/70">
                              Are you sure you want to delete ALL your questions and answers? This will permanently remove {qaHistory.length} question{qaHistory.length !== 1 ? 's' : ''} from your account. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAll}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete All Questions
                                </>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Q&A History */}
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mb-4 mx-auto text-white/60" />
                <p className="text-white/70">Loading your Q&A history...</p>
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="space-y-4">
                {filteredHistory.map((qa, index) => (
                  <Card 
                    key={qa._id} 
                    ref={index === 0 ? latestAnswerRef : null}
                    className={`card-glow border-white/20 animate-slide-up transition-all duration-200 ${
                      selectedQuestions.has(qa._id) ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
                    }`}
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <CardContent className="pt-6 px-4 sm:px-6">
                      {/* Selection and Actions Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {isSelectionMode && (
                            <Checkbox
                              checked={selectedQuestions.has(qa._id)}
                              onCheckedChange={() => toggleQuestionSelection(qa._id)}
                              className="border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          )}
                          <div className="text-xs text-white/50">
                            Question #{filteredHistory.length - index}
                          </div>
                        </div>
                        
                        {!isSelectionMode && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-900 border-white/20" align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteSingle(qa._id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Question
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      {/* Question */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-full bg-blue-500/20">
                              <MessageCircle className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-300">Question</p>
                              <div className="flex items-center space-x-2 text-xs text-white/60">
                                <Badge variant="outline" className="border-white/20 text-white/70">
                                  {languageNames[qa.language] || qa.language}
                                </Badge>
                                {qa.isVoiceInput && (
                                  <Badge variant="outline" className="border-purple-400/30 text-purple-300">
                                    <Mic className="h-3 w-3 mr-1" />
                                    Voice
                                  </Badge>
                                )}
                                <span>{formatDate(qa.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-white text-sm sm:text-base pl-12">{qa.question}</p>
                      </div>

                      {/* Answer */}
                      <div className="border-t border-white/10 pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-full bg-green-500/20">
                              <Brain className="h-4 w-4 text-green-400" />
                            </div>
                            <p className="text-sm font-medium text-green-300">Answer</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePlayAnswer(qa._id, qa.answer, qa.language)}
                            className="text-white/60 hover:text-white flex-shrink-0"
                            title={isPlaying === qa._id ? 'Stop audio' : 'Play answer'}
                          >
                            {isPlaying === qa._id ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="pl-12">
                          <div className="prose prose-invert max-w-none text-white/90 text-sm sm:text-base">
                            {qa.answer.split('\n').map((paragraph, pIndex) => (
                              <p key={pIndex} className="mb-2 last:mb-0">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="card-glow border-white/20 text-center py-8 sm:py-12">
                <CardContent>
                  {searchTerm || filterLanguage !== 'all' ? (
                    <>
                      <Search className="h-12 w-12 sm:h-16 sm:w-16 text-white/40 mx-auto mb-4" />
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No results found</h3>
                      <p className="text-white/70 mb-4 text-sm sm:text-base">
                        Try adjusting your search terms or language filter
                      </p>
                      <Button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterLanguage('all');
                        }}
                        className="btn-secondary"
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white/40 mx-auto mb-4" />
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No questions yet</h3>
                      <p className="text-white/70 mb-6 text-sm sm:text-base">
                        Start your learning journey by asking your first question!
                      </p>
                      <Button
                        onClick={() => setActiveTab('ask')}
                        className="btn-primary"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Ask Your First Question
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}