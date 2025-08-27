'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight, RotateCcw, Zap, Sparkles, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { createTextToSpeech } from '../../lib/voice';

const subjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'English', 'Computer Science'
];

const difficulties = [
  'Beginner', 'Intermediate', 'Advanced'
];

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' }
];

export default function QuizPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Quiz setup state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [numQuestions, setNumQuestions] = useState(5);
  
  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [listeningStatus, setListeningStatus] = useState('');

  // Create text-to-speech instance with callback
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
  }, [session, status, router]);

  const generateQuiz = async () => {
    if (!selectedSubject || !selectedDifficulty) {
      setError('Please select subject and difficulty');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          language: selectedLanguage,
          numQuestions,
        }),
      });

      if (response.ok) {
        const quiz = await response.json();
        setCurrentQuiz(quiz);
        setCurrentQuestionIndex(0);
        setSelectedAnswers(new Array(quiz.questions.length).fill(-1));
        setShowResults(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate quiz');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: currentQuiz.id,
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

  const resetQuiz = () => {
    setCurrentQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setQuizResults(null);
    setError('');
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
        // Use the quiz language instead of selected language for TTS
        const quizLanguage = currentQuiz?.language || selectedLanguage;
        
        console.log(`Playing quiz text in ${quizLanguage}:`, text.substring(0, 50) + '...');
        await textToSpeech.speak(text, quizLanguage);
        setIsPlaying(false);
      }
    } catch (error: any) {
      console.error('Quiz TTS Error:', error);
      setError(`Text-to-speech error for ${currentQuiz?.language || selectedLanguage}: ${error.message}`);
      setIsPlaying(false);
      setListeningStatus('');
    }
  };

  // Show loading if session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen space-bg flex items-center justify-center">
        <div className="text-white text-center">
          <div className="spinner mb-4 mx-auto" />
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


        {!currentQuiz ? (
          
          // Quiz Setup
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-start">
              <Link href="/" className="inline-flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </Link>
            </div>
            <Card className="card-glow border-white/20 animate-slide-up">
            <CardHeader className="text-center">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl text-white mb-3 sm:mb-4">
                Generate Your Quiz
              </CardTitle>
              <CardDescription className="text-white/70 text-sm sm:text-base md:text-lg">
                Create a personalized quiz in your preferred language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div>
                  <Label className="text-white mb-1 sm:mb-2 block text-sm sm:text-base">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="input-dark">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject} className="text-white hover:bg-white/10">
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-1 sm:mb-2 block text-sm sm:text-base">Difficulty</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="input-dark">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty.toLowerCase()} className="text-white hover:bg-white/10">
                          {difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-1 sm:mb-2 block text-sm sm:text-base">Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                          {lang.native}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-1 sm:mb-2 block text-sm sm:text-base">Number of Questions</Label>
                  <Select value={numQuestions.toString()} onValueChange={(value) => setNumQuestions(parseInt(value))}>
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {[3, 5, 10, 15, 20].map((num) => (
                        <SelectItem key={num} value={num.toString()} className="text-white hover:bg-white/10">
                          {num} Questions
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-center pt-2 sm:pt-4">
                <Button 
                  onClick={generateQuiz}
                  disabled={isGenerating || !selectedSubject || !selectedDifficulty}
                  className="btn-primary text-sm sm:text-base md:text-lg px-6 sm:px-8 py-2 sm:py-3"
                >
                  {isGenerating ? (
                    <>
                      <div className="spinner mr-2" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        ) : showResults ? (
          // Quiz Results
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-start">
              <Link href="/" className="inline-flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
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
              <Button onClick={resetQuiz} className="btn-primary">
                <RotateCcw className="h-4 w-4 mr-2" />
                Take Another Quiz
              </Button>
              <Link href="/dashboard">
                <Button className="btn-secondary">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Quiz Taking Interface
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-start">
              <Link href="/" className="inline-flex items-center space-x-2 text-white/80 hover:text-blue-400 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </Link>
            </div>
            {/* Progress */}
            <Card className="card-glow border-white/20">
              <CardContent className="pt-6 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">{currentQuiz.title}</h2>
                  <Badge className="bg-blue-600 text-white">
                    {currentQuestionIndex + 1} / {currentQuiz.questions.length}
                  </Badge>
                </div>
                {currentQuiz && (
                  <Progress
                    value={
                      typeof currentQuestionIndex === 'number' && currentQuiz.questions.length
                        ? ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100
                        : 0
                    }
                    className="progress-glow"
                  />
                )}

                {/* <Progress value={progressValue} className="progress-glow" /> */}

              </CardContent>
            </Card>

            {/* Current Question */}
            <Card className="card-glow border-white/20">
              <CardContent className="pt-6 px-4 sm:px-6">
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white flex-1 pr-2 sm:pr-4">
                    {currentQuestionIndex + 1}. {currentQuiz.questions[currentQuestionIndex].question}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePlayQuestion(currentQuiz.questions[currentQuestionIndex].question)}
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
                  {currentQuiz.questions[currentQuestionIndex].options.map((option: string, index: number) => (
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

              {currentQuestionIndex === currentQuiz.questions.length - 1 ? (
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