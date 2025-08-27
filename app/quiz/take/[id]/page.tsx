'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { createTextToSpeech } from '../../../../lib/voice';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  _id: string;
  title: string;
  subject: string;
  difficulty: string;
  language: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export default function TakeQuizPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  
  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
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
    
    loadQuiz();
  }, [session, status, router, quizId]);

  const loadQuiz = async () => {
    if (!session || !quizId) return;
    
    try {
      setError('');
      const response = await fetch(`/api/quiz/${quizId}`);
      
      if (response.ok) {
        const quizData = await response.json();
        setQuiz(quizData);
        setSelectedAnswers(new Array(quizData.questions.length).fill(-1));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load quiz');
      }
    } catch (error) {
      console.error('Load quiz error:', error);
      setError('Something went wrong loading the quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz._id,
          answers: selectedAnswers,
        }),
      });

      if (response.ok) {
        const results = await response.json();
        setQuizResults(results);
        setShowResults(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit quiz');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayQuestion = async (text: string) => {
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
        const quizLanguage = quiz?.language || 'en';
        
        console.log(`Playing quiz text in ${quizLanguage}:`, text.substring(0, 50) + '...');
        await textToSpeech.speak(text, quizLanguage);
        setIsPlaying(false);
      }
    } catch (error: any) {
      console.error('Quiz TTS Error:', error);
      setError(`Text-to-speech error for ${quiz?.language || 'en'}: ${error.message}`);
      setIsPlaying(false);
      setListeningStatus('');
    }
  };

  // Show loading if session is loading
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen space-bg flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4 mx-auto" />
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  // Show error if quiz not found
  if (error && !quiz) {
    return (
      <div className="min-h-screen space-bg">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-16 sm:mt-20">
          <div className="flex justify-start mb-6">
            <Link href="/dashboard" className="inline-flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <Card className="card-glow border-white/20 text-center py-8 sm:py-12">
            <CardContent>
              <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Quiz Not Found</h3>
              <p className="text-white/70 mb-6 text-sm sm:text-base">{error}</p>
              <Link href="/dashboard">
                <Button className="btn-primary">
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="min-h-screen space-bg">
      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* Common Navbar */}
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-16 sm:mt-20">
        {error && (
          <div className="mb-4 sm:mb-6 text-red-400 text-xs sm:text-sm bg-red-500/10 p-2 sm:p-3 rounded-lg animate-slide-in">
            {error}
          </div>
        )}

        {listeningStatus && (
          <div className="mb-4 sm:mb-6 text-center">
            <div className="inline-flex items-center space-x-3 bg-blue-500/10 text-blue-300 px-4 py-2 rounded-lg border border-blue-400/30">
              {listeningStatus.includes('Speaking') && (
                <div className="speaking-wave">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              )}
              {listeningStatus.includes('Preparing') && (
                <div className="spinner-small"></div>
              )}
              <span className="text-xs sm:text-sm font-medium">{listeningStatus}</span>
            </div>
          </div>
        )}

        {showResults ? (
          // Quiz Results
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-start">
              <Link href="/dashboard" className="inline-flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <Card className="card-glow border-white/20 bg-gradient-to-r from-green-600/20 to-blue-600/20">
              <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl md:text-3xl text-white mb-3 sm:mb-4">
                  Quiz Complete! 🎉
                </CardTitle>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400">{quizResults?.score}%</div>
                    <p className="text-white/70 text-sm sm:text-base">Your Score</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                      {quizResults?.correctAnswers}/{quizResults?.totalQuestions}
                    </div>
                    <p className="text-white/70 text-sm sm:text-base">Correct Answers</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Detailed Results */}
            <div className="space-y-4">
              {quizResults?.results.map((result: any, index: number) => (
                <Card key={index} className={`card-glow border-white/20 ${result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <CardContent className="pt-6 px-4 sm:px-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex-1 pr-2 sm:pr-4">
                        {index + 1}. {result.question}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePlayQuestion(result.question)}
                        className="text-white/60 hover:text-white flex-shrink-0"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      {result.options.map((option: string, optionIndex: number) => (
                        <div
                          key={optionIndex}
                          className={`p-2 sm:p-3 rounded-lg border text-xs sm:text-sm ${
                            optionIndex === result.correctAnswer
                              ? 'bg-green-500/20 border-green-400/50 text-green-300'
                              : optionIndex === result.userAnswer && !result.isCorrect
                              ? 'bg-red-500/20 border-red-400/50 text-red-300'
                              : 'bg-white/5 border-white/20 text-white/80'
                          }`}
                        >
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {optionIndex === result.correctAnswer && (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            )}
                            {optionIndex === result.userAnswer && !result.isCorrect && (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span>{option}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-blue-500/10 p-2 sm:p-3 rounded-lg border border-blue-400/30">
                      <p className="text-blue-300 text-xs sm:text-sm font-medium mb-1">Explanation:</p>
                      <p className="text-white/80 text-xs sm:text-sm">{result.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button onClick={() => window.location.reload()} className="btn-primary">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
              <Link href="/dashboard">
                <Button className="btn-secondary">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Quiz Taking Interface
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-start">
              <Link href="/dashboard" className="inline-flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            
            {/* Quiz Info */}
            <Card className="card-glow border-white/20">
              <CardContent className="pt-6 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">{quiz.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-600 text-white text-xs">
                      {quiz.subject}
                    </Badge>
                    <Badge className="bg-purple-600 text-white text-xs">
                      {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                    </Badge>
                    <Badge className="bg-green-600 text-white text-xs">
                      {currentQuestionIndex + 1} / {quiz.questions.length}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} 
                  className="progress-glow"
                />
              </CardContent>
            </Card>

            {/* Current Question */}
            <Card className="card-glow border-white/20">
              <CardContent className="pt-6 px-4 sm:px-6">
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white flex-1 pr-2 sm:pr-4">
                    {currentQuestionIndex + 1}. {quiz.questions[currentQuestionIndex].question}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePlayQuestion(quiz.questions[currentQuestionIndex].question)}
                    className="text-white/60 hover:text-white flex-shrink-0"
                  >
                    {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
                
                <RadioGroup
                  value={selectedAnswers[currentQuestionIndex]?.toString() || ''}
                  onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                  className="space-y-3"
                >
                  {quiz.questions[currentQuestionIndex].options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <RadioGroupItem 
                        value={index.toString()} 
                        id={`option-${index}`}
                        className="border-white/30 text-blue-400"
                      />
                      <Label 
                        htmlFor={`option-${index}`} 
                        className="text-white cursor-pointer flex-1 text-xs sm:text-sm md:text-base"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
              <Button
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <Button
                  onClick={submitQuiz}
                  disabled={selectedAnswers.includes(-1) || isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextQuestion}
                  disabled={selectedAnswers[currentQuestionIndex] === -1}
                  className="btn-primary"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}