import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateAnswer(question: string, language: string = 'en') {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Use the latest Gemini Pro model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'bn': 'Bengali (বাংলা)',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'gu': 'Gujarati',
      'mr': 'Marathi',
      'pa': 'Punjabi'
    };

    const targetLanguage = languageMap[language] || 'English';

    const prompt = `You are VoiceMitra, an expert AI tutor designed specifically for Indian students. Your role is to provide clear, accurate, and educational responses.

IMPORTANT INSTRUCTIONS:
- Always respond in ${targetLanguage} language using proper script and characters
- If the target language is ${targetLanguage}, write your entire response in that language's native script
- For Indian languages, use Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, or other appropriate scripts
- Provide accurate, factual information based on the specific question asked
- Make explanations clear and suitable for students
- Include examples when helpful
- Be encouraging and supportive
- Give detailed, comprehensive answers
- Never give generic responses - always address the specific question

Question: "${question}"

Please provide a detailed, specific answer to this exact question in ${targetLanguage}. 
${language !== 'en' ? `Write your response using the native script of ${targetLanguage} language.` : ''}
Make sure your response directly addresses what was asked and provides educational value.`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini API response received:', text.substring(0, 100) + '...');
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }
    
    return text.trim();
  } catch (error) {
    console.error('Gemini API Error Details:', {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      apiKey: process.env.GEMINI_API_KEY ? 'Present' : 'Missing'
    });
    
    // Only fall back if there's a real API error, not for missing API key
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('GEMINI_API_KEY')) {
      throw new Error('AI service is not properly configured. Please contact support.');
    }
    
    // For other errors, try to provide a more specific error message
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      if ((error as any).message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your Gemini API configuration.');
      }
      
      if ((error as any).message.includes('QUOTA_EXCEEDED')) {
        throw new Error('API quota exceeded. Please try again later.');
      }
      
      if ((error as any).message.includes('SAFETY')) {
        throw new Error('Content was blocked by safety filters. Please rephrase your question.');
      }
      
      // Re-throw the original error instead of falling back
      throw new Error(`Failed to generate answer: ${(error as any).message}`);
    } else {
      throw new Error('Failed to generate answer: Unknown error');
    }
  }
}

export async function generateQuiz(subject: string, difficulty: string, language: string = 'en', numQuestions: number = 5) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    const languageMap: { [key: string]: string } = {
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

    const targetLanguage = languageMap[language] || 'English';

    const prompt = `You are VoiceMitra, an expert AI tutor. Generate a high-quality educational quiz for Indian students.

STRICT REQUIREMENTS:
- Subject: ${subject}
- Difficulty: ${difficulty}
- Language: ${targetLanguage}
- Number of questions: ${numQuestions}
- Format: Valid JSON only

Create exactly ${numQuestions} multiple choice questions that are:
1. Educationally valuable and relevant to Indian curriculum
2. Appropriate for ${difficulty} level students
3. Written clearly in ${targetLanguage} language
4. Have exactly 4 options each (A, B, C, D)
5. Include detailed explanations for learning

CRITICAL: Return ONLY a valid JSON array with this EXACT structure:
[
  {
    "question": "Clear question text in ${targetLanguage}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed educational explanation in ${targetLanguage}"
  }
]

NO additional text, NO markdown formatting, NO code blocks - ONLY the JSON array.`;

    console.log('Generating quiz with Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Quiz generation response received');
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }
    
    // Clean the response
    let jsonText = text.trim();
    
    // Remove any markdown formatting
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', jsonText);
      throw new Error('No valid JSON found in response');
    }
    
    let quizData;
    try {
      quizData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', jsonText);
      throw new Error('Invalid JSON format in response');
    }
    
    // Validate the quiz data
    if (!Array.isArray(quizData) || quizData.length === 0) {
      throw new Error('Quiz data is not a valid array');
    }
    
    // Validate each question
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3 ||
          !q.explanation) {
        console.error('Invalid question at index', i, ':', q);
        throw new Error(`Invalid question format at index ${i}`);
      }
    }
    
    return quizData;
  } catch (error) {
    console.error('Quiz generation error:', error);
    
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('GEMINI_API_KEY')) {
      throw new Error('AI service is not properly configured. Please contact support.');
    }
    
    // Re-throw the original error instead of falling back
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      throw new Error(`Failed to generate quiz: ${(error as any).message}`);
    } else {
      throw new Error('Failed to generate quiz: Unknown error');
    }
  }
}

export async function detectLanguage(text: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      // Fallback to simple detection
      return detectLanguageSimple(text);
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro-latest',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const prompt = `Detect the language of the following text and return ONLY the language code.

Supported language codes:
- en (English)
- hi (Hindi)
- bn (Bengali)
- ta (Tamil)
- te (Telugu)
- kn (Kannada)
- ml (Malayalam)
- gu (Gujarati)
- mr (Marathi)
- pa (Punjabi)

Text: "${text}"

Return ONLY the two-letter language code, nothing else:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const detectedLanguage = response.text().trim().toLowerCase().replace(/[^a-z]/g, '');
    
    // Validate the detected language
    const validLanguages = ['en', 'hi', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'mr', 'pa'];
    return validLanguages.includes(detectedLanguage) ? detectedLanguage : 'en';
  } catch (error) {
    console.error('Error detecting language:', error);
    return detectLanguageSimple(text);
  }
}

function detectLanguageSimple(text: string): string {
  // Simple language detection based on character patterns
  const hindiPattern = /[\u0900-\u097F]/;
  const bengaliPattern = /[\u0980-\u09FF]/;
  const tamilPattern = /[\u0B80-\u0BFF]/;
  const teluguPattern = /[\u0C00-\u0C7F]/;
  const kannadaPattern = /[\u0C80-\u0CFF]/;
  const malayalamPattern = /[\u0D00-\u0D7F]/;
  const gujaratiPattern = /[\u0A80-\u0AFF]/;
  const marathiPattern = /[\u0900-\u097F]/; // Similar to Hindi
  const punjabiPattern = /[\u0A00-\u0A7F]/;

  if (hindiPattern.test(text)) return 'hi';
  if (bengaliPattern.test(text)) return 'bn';
  if (tamilPattern.test(text)) return 'ta';
  if (teluguPattern.test(text)) return 'te';
  if (kannadaPattern.test(text)) return 'kn';
  if (malayalamPattern.test(text)) return 'ml';
  if (gujaratiPattern.test(text)) return 'gu';
  if (marathiPattern.test(text)) return 'mr';
  if (punjabiPattern.test(text)) return 'pa';
  return 'en'; // Default to English
}