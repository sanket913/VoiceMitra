// Voice utilities using Web Speech API (free and built into browsers)

// Enhanced voice recognition with better error handling and visual feedback
export class VoiceRecognition {
  private recognition: any;
  private isListening: boolean = false;
  private onStatusChange?: (status: string) => void;
  private onError?: (error: string) => void;
  private finalTranscript: string = '';
  private interimTranscript: string = '';

  constructor(onStatusChange?: (status: string) => void, onError?: (error: string) => void) {
    this.onStatusChange = onStatusChange;
    this.onError = onError;
    
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        
        // Enhanced configuration for better recognition
        this.recognition.continuous = true; // Keep listening for continuous speech
        this.recognition.interimResults = true; // Get interim results while speaking
        this.recognition.maxAlternatives = 3; // Get multiple alternatives
        
        // Set up event listeners for better feedback
        this.setupEventListeners();
      }
    }
  }

  private setupEventListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
      this.finalTranscript = '';
      this.interimTranscript = '';
      this.onStatusChange?.('🎤 Listening... Start speaking now');
    };

    this.recognition.onaudiostart = () => {
      console.log('Audio capture started');
      this.onStatusChange?.('🔊 Microphone active - Speak clearly');
    };

    this.recognition.onsoundstart = () => {
      console.log('Sound detected');
      this.onStatusChange?.('🗣️ Voice detected - Keep talking');
    };

    this.recognition.onspeechstart = () => {
      console.log('Speech detected');
      this.onStatusChange?.('✨ Processing your speech...');
    };

    this.recognition.onresult = (event: any) => {
      console.log('Voice recognition result event:', event);
      
      let interimTranscript = '';
      let finalTranscript = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log('Final transcript:', transcript);
        } else {
          interimTranscript += transcript;
          console.log('Interim transcript:', transcript);
        }
      }

      // Update transcripts
      if (finalTranscript) {
        this.finalTranscript += finalTranscript;
      }
      this.interimTranscript = interimTranscript;

      // Show current progress
      const currentText = this.finalTranscript + this.interimTranscript;
      if (currentText.trim()) {
        this.onStatusChange?.(`📝 Recognized: "${currentText.trim()}"`);
      }
    };

    this.recognition.onspeechend = () => {
      console.log('Speech ended');
      this.onStatusChange?.('⏳ Processing complete speech...');
    };

    this.recognition.onaudioend = () => {
      console.log('Audio capture ended');
    };

    this.recognition.onend = () => {
      console.log('Voice recognition ended');
      this.isListening = false;
      
      // Return the final transcript if we have one
      if (this.finalTranscript.trim()) {
        this.onStatusChange?.('✅ Speech recognition complete!');
      } else {
        this.onStatusChange?.('');
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event);
      this.isListening = false;
      
      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please speak clearly and try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check your microphone permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access and refresh the page.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was stopped.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      this.onError?.(errorMessage);
    };
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  async startListening(language: string = 'en-US'): Promise<string> {
    if (!this.recognition || this.isListening) {
      throw new Error('Speech recognition not available or already listening');
    }

    // Clear any previous status
    this.onStatusChange?.('🔧 Initializing microphone...');

    // Map language codes to speech recognition language codes
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'gu': 'gu-IN',
      'mr': 'mr-IN',
      'pa': 'pa-IN',
    };

    this.recognition.lang = languageMap[language] || 'en-US';

    return new Promise((resolve, reject) => {
      let hasResult = false;
      let timeoutId: NodeJS.Timeout | undefined = undefined;
      let silenceTimeoutId: NodeJS.Timeout | undefined;

      // Override the onresult handler for this session
      const originalOnResult = this.recognition.onresult;
      this.recognition.onresult = (event: any) => {
        // Call the original handler for status updates
        originalOnResult.call(this.recognition, event);
        
        // Reset silence timeout when we get speech
        if (silenceTimeoutId) {
          clearTimeout(silenceTimeoutId);
        }
        
        // Set a new silence timeout
        silenceTimeoutId = setTimeout(() => {
          if (this.isListening && this.finalTranscript.trim()) {
            console.log('Stopping due to silence with transcript:', this.finalTranscript);
            this.recognition.stop();
          }
        }, 2000); // Stop after 2 seconds of silence if we have text
      };

      // Override the onend handler for this session
      const originalOnEnd = this.recognition.onend;
      this.recognition.onend = () => {
        console.log('Recognition ended, final transcript:', this.finalTranscript);
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (silenceTimeoutId !== undefined) clearTimeout(silenceTimeoutId);
        
        // Restore original handlers
        this.recognition.onresult = originalOnResult;
        this.recognition.onend = originalOnEnd;
        
        this.isListening = false;
        this.onStatusChange?.('');
        
        if (!hasResult) {
          if (this.finalTranscript.trim()) {
            hasResult = true;
            resolve(this.finalTranscript.trim());
          } else {
            reject(new Error('No speech detected. Please speak clearly and try again.'));
          }
        }
      };

      // Add timeout to prevent hanging (30 seconds)
      timeoutId = setTimeout(() => {
        if (this.isListening) {
          clearTimeout(silenceTimeoutId);
          this.recognition.stop();
          if (this.finalTranscript.trim()) {
            hasResult = true;
            resolve(this.finalTranscript.trim());
          } else {
            this.onError?.('Speech recognition timeout. Please try speaking again.');
            reject(new Error('Speech recognition timeout. Please try speaking again.'));
          }
        }
      }, 30000); // 30 second timeout

      try {
        this.isListening = true;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.onStatusChange?.('🚀 Starting microphone...');
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (silenceTimeoutId !== undefined) clearTimeout(silenceTimeoutId);
        this.onError?.('Failed to start speech recognition. Please try again.');
        reject(new Error('Failed to start speech recognition'));
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      console.log('Manually stopping recognition');
      this.recognition.stop();
      this.isListening = false;
      this.onStatusChange?.('');
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getCurrentTranscript(): string {
    return this.finalTranscript + this.interimTranscript;
  }
}

// Enhanced text-to-speech with better error handling
export class TextToSpeech {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStatusChange?: (status: string) => void;

  constructor(onStatusChange?: (status: string) => void) {
    this.onStatusChange = onStatusChange;
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return !!this.synth;
  }

  // Helper method to clean text for speech
  cleanTextForSpeech(text: string): string {
    return text
      // Remove all markdown formatting
      .replace(/\*\*\*(.*?)\*\*\*/g, '$1') // Remove bold+italic ***text***
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
      .replace(/__(.*?)__/g, '$1') // Remove bold __text__
      .replace(/_(.*?)_/g, '$1') // Remove italic _text_
      .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough ~~text~~
      .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks ```code```
      .replace(/`(.*?)`/g, '$1') // Remove inline code `code`
      .replace(/#{1,6}\s*/g, '') // Remove headers # ## ### etc
      .replace(/>\s*/g, '') // Remove blockquotes >
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url) -> text
      .replace(/\[([^\]]+)\]/g, '$1') // Remove brackets [text] -> text
      .replace(/\(([^)]+)\)/g, ' $1 ') // Convert parentheses to spaces
      .replace(/[-*+]\s+/g, '') // Remove list markers - * +
      .replace(/\d+\.\s+/g, '') // Remove numbered list markers 1. 2. etc
      .replace(/\|/g, ' ') // Replace table separators with spaces
      .replace(/\n{2,}/g, '. ') // Replace multiple newlines with period and space
      .replace(/\n/g, ' ') // Replace single newlines with spaces
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u1000-\u109F.,!?;:()\-।]/g, ' ') // Keep only letters, numbers, spaces, and basic punctuation + Indian scripts + Hindi punctuation
      .replace(/\s+/g, ' ') // Final cleanup of multiple spaces
      .trim();
  }

  async speak(text: string, language: string = 'en'): Promise<void> {
    if (!this.synth) {
      throw new Error('Text-to-speech not supported');
    }

    // Stop any current speech
    this.stop();

    this.onStatusChange?.('🔊 Preparing to speak...');

    // Clean the text before speaking
    const cleanText = this.cleanTextForSpeech(text);
    
    if (!cleanText.trim()) {
      throw new Error('No readable text found after cleaning');
    }

    // Enhanced language mapping for better TTS support
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'bn': 'bn-BD', // Bengali - try Bangladesh first, fallback to India
      'ta': 'ta-IN', // Tamil
      'te': 'te-IN', // Telugu
      'kn': 'kn-IN', // Kannada
      'ml': 'ml-IN', // Malayalam
      'gu': 'gu-IN', // Gujarati
      'mr': 'mr-IN', // Marathi
      'pa': 'pa-IN', // Punjabi
    };

    // Fallback language mappings if primary doesn't work
    const fallbackLanguageMap: { [key: string]: string[] } = {
      'hi': ['hi-IN', 'hi', 'en-IN', 'en-US'],
      'bn': ['bn-IN', 'bn-BD', 'hi-IN', 'en-US'],
      'ta': ['ta-IN', 'ta-LK', 'hi-IN', 'en-US'],
      'te': ['te-IN', 'hi-IN', 'en-US'],
      'kn': ['kn-IN', 'hi-IN', 'en-US'],
      'ml': ['ml-IN', 'hi-IN', 'en-US'],
      'gu': ['gu-IN', 'hi-IN', 'en-US'],
      'mr': ['mr-IN', 'hi-IN', 'en-US'],
      'pa': ['pa-IN', 'pa-PK', 'hi-IN', 'en-US'],
    };
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Set initial language
      const primaryLang = languageMap[language] || 'en-US';
      utterance.lang = primaryLang;
      
      // Configure speech parameters for better quality
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      // Enhanced voice selection with fallback mechanism
      const voices = this.synth!.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      console.log('Cleaned text for TTS:', cleanText.substring(0, 100) + '...');
      
      let selectedVoice = null;
      
      // Try to find exact language match first
      selectedVoice = voices.find(voice => voice.lang === primaryLang);
      
      // Special handling for Hindi - try multiple variations
      if (!selectedVoice && language === 'hi') {
        selectedVoice = voices.find(voice => 
          voice.lang === 'hi-IN' || 
          voice.lang === 'hi' || 
          voice.lang.startsWith('hi-') ||
          (voice.name && voice.name.toLowerCase().includes('hindi'))
        );
        console.log('Hindi voice search result:', selectedVoice?.name, selectedVoice?.lang);
      }
      
      // If no exact match, try language prefix match
      if (!selectedVoice) {
        const langPrefix = primaryLang.split('-')[0];
        selectedVoice = voices.find(voice => voice.lang.startsWith(langPrefix));
      }
      
      // Try fallback languages if available
      if (!selectedVoice && fallbackLanguageMap[language]) {
        for (const fallbackLang of fallbackLanguageMap[language]) {
          selectedVoice = voices.find(voice => voice.lang === fallbackLang);
          if (selectedVoice) {
            utterance.lang = fallbackLang;
            console.log(`Using fallback language: ${fallbackLang} for ${language}`);
            break;
          }
          
          // Try prefix match for fallback
          const fallbackPrefix = fallbackLang.split('-')[0];
          selectedVoice = voices.find(voice => voice.lang.startsWith(fallbackPrefix));
          if (selectedVoice) {
            utterance.lang = fallbackLang;
            console.log(`Using fallback language prefix: ${fallbackLang} for ${language}`);
            break;
          }
        }
      }
      
      // Set the selected voice
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${language} (${primaryLang})`);
      } else {
        console.warn(`No suitable voice found for language: ${language} (${primaryLang}), using default`);
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      }

      utterance.onstart = () => {
        this.onStatusChange?.('🗣️ Speaking...');
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.onStatusChange?.('');
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.onStatusChange?.('');
        console.error('TTS Error:', event.error, 'for language:', language);
        
        // If error occurs, try with English as last resort
        if (utterance.lang !== 'en-US') {
          console.log('Retrying with English...');
          const englishUtterance = new SpeechSynthesisUtterance(cleanText);
          englishUtterance.lang = 'en-US';
          englishUtterance.rate = 0.9;
          englishUtterance.pitch = 1.0;
          englishUtterance.volume = 1;
          
          const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
          if (englishVoice) {
            englishUtterance.voice = englishVoice;
          }
          
          englishUtterance.onend = () => {
            this.currentUtterance = null;
            this.onStatusChange?.('');
            resolve();
          };
          
          englishUtterance.onerror = () => {
            this.currentUtterance = null;
            this.onStatusChange?.('');
            reject(new Error(`Text-to-speech failed for both ${language} and English`));
          };
          
          this.currentUtterance = englishUtterance;
          this.synth!.speak(englishUtterance);
        } else {
          reject(new Error(`Text-to-speech error: ${event.error}`));
        }
      };

      this.currentUtterance = utterance;
      if (this.synth) {
        this.synth.speak(utterance);
      } else {
        reject(new Error('Text-to-speech not supported'));
      }
    });
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      this.onStatusChange?.('');
    }
  }

  isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    
    const voices = this.synth.getVoices();
    console.log('All available voices:', voices.map(v => `${v.name} (${v.lang}) - ${v.localService ? 'Local' : 'Remote'}`));
    return voices;
  }
  
  // New method to get voices for a specific language
  getVoicesForLanguage(language: string): SpeechSynthesisVoice[] {
    const voices = this.getAvailableVoices();
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'bn': 'bn-BD',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'gu': 'gu-IN',
      'mr': 'mr-IN',
      'pa': 'pa-IN',
    };
    
    const targetLang = languageMap[language] || language;
    const langPrefix = targetLang.split('-')[0];
    
    // Special handling for Hindi
    if (language === 'hi') {
      return voices.filter(voice => 
        voice.lang === 'hi-IN' || 
        voice.lang === 'hi' || 
        voice.lang.startsWith('hi-') ||
        (voice.name && voice.name.toLowerCase().includes('hindi'))
      );
    }
    
    return voices.filter(voice => 
      voice.lang === targetLang || 
      voice.lang.startsWith(langPrefix)
    );
  }
}

// Factory functions to create instances with callbacks
export function createVoiceRecognition(onStatusChange?: (status: string) => void, onError?: (error: string) => void) {
  return new VoiceRecognition(onStatusChange, onError);
}

export function createTextToSpeech(onStatusChange?: (status: string) => void) {
  return new TextToSpeech(onStatusChange);
}

// Legacy exports for backward compatibility
export const voiceRecognition = new VoiceRecognition();
export const textToSpeech = new TextToSpeech();