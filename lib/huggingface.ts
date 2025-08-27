// Hugging Face API integration (free and unlimited)

const HF_API_URL = 'https://api-inference.huggingface.co/models';

// Use different models for different tasks
const MODELS = {
  TEXT_GENERATION: 'microsoft/DialoGPT-medium',
  QUESTION_ANSWERING: 'deepset/roberta-base-squad2',
  TEXT_CLASSIFICATION: 'facebook/bart-large-mnli'
};

async function queryHuggingFace(model: string, inputs: any, options: any = {}) {
  const response = await fetch(`${HF_API_URL}/${model}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      inputs,
      options: {
        wait_for_model: true,
        use_cache: false,
        ...options
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  return response.json();
}

export async function generateAnswer(question: string, language: string = 'en') {
  try {
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

    // Create a comprehensive prompt for text generation
    const prompt = `Question: ${question}

Please provide a detailed educational answer in ${targetLanguage} language. Include:
1. A clear explanation
2. Key concepts
3. An example if applicable
4. Important points to remember

Answer:`;

    // Use text generation model
    const result = await queryHuggingFace(
      'microsoft/DialoGPT-medium',
      prompt,
      {
        max_length: 500,
        temperature: 0.7,
        do_sample: true,
        top_p: 0.9
      }
    );

    // Extract the generated text
    let answer = '';
    if (result && result[0] && result[0].generated_text) {
      answer = result[0].generated_text.replace(prompt, '').trim();
    }

    // If the answer is too short or empty, provide a fallback
    if (!answer || answer.length < 50) {
      answer = await generateFallbackAnswer(question, targetLanguage);
    }

    return answer;
  } catch (error) {
    console.error('Error generating answer:', error);
    // Provide a fallback answer
    return await generateFallbackAnswer(question, language);
  }
}

async function generateFallbackAnswer(question: string, language: string) {
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

  // Simple fallback responses based on question keywords
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('math') || questionLower.includes('calculate') || questionLower.includes('solve')) {
    return `This is a mathematics question about: "${question}". To solve mathematical problems, follow these steps:

1. **Understand the Problem**: Read the question carefully and identify what is being asked.
2. **Identify Given Information**: List all the known values and variables.
3. **Choose the Right Method**: Select the appropriate formula or method to solve the problem.
4. **Calculate Step by Step**: Work through the solution systematically.
5. **Verify Your Answer**: Check if your result makes sense.

For specific mathematical concepts, it's helpful to:
- Practice similar problems
- Understand the underlying principles
- Use visual aids like graphs or diagrams when applicable

If you need help with a specific calculation, please provide the exact numbers and I'll guide you through the solution process.`;
  }

  if (questionLower.includes('science') || questionLower.includes('physics') || questionLower.includes('chemistry') || questionLower.includes('biology')) {
    return `This is a science question about: "${question}". Here's a comprehensive approach to understanding scientific concepts:

**Key Learning Strategy:**
1. **Observe and Question**: Start by understanding what you're observing or studying
2. **Research**: Gather information from reliable sources
3. **Understand Principles**: Learn the fundamental laws and theories
4. **Apply Knowledge**: Practice with examples and real-world applications
5. **Experiment**: When possible, conduct experiments to verify concepts

**Important Scientific Method:**
- Make observations
- Form hypotheses
- Test through experiments
- Analyze results
- Draw conclusions

For this specific topic, I recommend:
- Breaking down complex concepts into smaller parts
- Using diagrams and visual aids
- Connecting new information to what you already know
- Practicing with similar problems

Would you like me to explain any specific aspect of this topic in more detail?`;
  }

  if (questionLower.includes('history') || questionLower.includes('when') || questionLower.includes('who') || questionLower.includes('where')) {
    return `This is a question about: "${question}". Understanding historical and factual information requires:

**Research Approach:**
1. **Context**: Understand the time period and circumstances
2. **Multiple Sources**: Cross-reference information from various reliable sources
3. **Cause and Effect**: Understand how events are connected
4. **Significance**: Learn why this information is important

**Key Points to Remember:**
- Historical events are interconnected
- Understanding context helps remember facts
- Primary sources provide the most accurate information
- Different perspectives can provide a fuller picture

**Study Tips:**
- Create timelines for historical events
- Use maps for geographical questions
- Make connections between different topics
- Practice active recall by testing yourself

For more specific information about this topic, I recommend consulting educational resources, textbooks, or verified online sources that can provide detailed and accurate information.`;
  }

  // General fallback
  return `Thank you for your question: "${question}". 

**General Learning Approach:**
1. **Break Down the Topic**: Divide complex subjects into smaller, manageable parts
2. **Research Thoroughly**: Use multiple reliable sources for comprehensive understanding
3. **Practice Regularly**: Apply what you learn through exercises and examples
4. **Ask Questions**: Don't hesitate to seek clarification on unclear points
5. **Connect Ideas**: Link new information to concepts you already understand

**Study Strategies:**
- Take detailed notes while learning
- Create summaries of key points
- Use visual aids like charts, diagrams, or mind maps
- Teach the concept to someone else to test your understanding
- Practice with similar questions or problems

**Next Steps:**
- Identify the specific subject area of your question
- Look up authoritative sources on the topic
- Practice with related exercises
- Seek help from teachers or tutors if needed

I'm here to help guide your learning process. Feel free to ask more specific questions, and I'll do my best to provide helpful educational guidance!`;
}

export async function generateQuiz(subject: string, difficulty: string, language: string = 'en', numQuestions: number = 5) {
  try {
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

    // Generate quiz questions using predefined templates
    const quizQuestions = await generateQuizQuestions(subject, difficulty, targetLanguage, numQuestions);
    
    return quizQuestions;
  } catch (error) {
    console.error('Error generating quiz:', error);
    // Return fallback quiz
    return generateFallbackQuiz(subject, difficulty, language, numQuestions);
  }
}

async function generateQuizQuestions(subject: string, difficulty: string, language: string, numQuestions: number) {
  // Predefined quiz templates based on subject and difficulty
  const quizTemplates = getQuizTemplates(subject, difficulty, language);
  
  // Randomly select questions from templates
  const selectedQuestions = [];
  const availableQuestions = [...quizTemplates];
  
  for (let i = 0; i < Math.min(numQuestions, availableQuestions.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    selectedQuestions.push(availableQuestions[randomIndex]);
    availableQuestions.splice(randomIndex, 1);
  }
  
  // If we need more questions, duplicate and modify existing ones
  while (selectedQuestions.length < numQuestions && quizTemplates.length > 0) {
    const randomTemplate = quizTemplates[Math.floor(Math.random() * quizTemplates.length)];
    selectedQuestions.push({
      ...randomTemplate,
      question: `${randomTemplate.question} (Variation ${selectedQuestions.length + 1})`
    });
  }
  
  return selectedQuestions;
}

function getQuizTemplates(subject: string, difficulty: string, language: string) {
  const templates: { [key: string]: any[] } = {
    'Mathematics': [
      {
        question: 'What is 15 + 27?',
        options: ['42', '41', '43', '40'],
        correctAnswer: 0,
        explanation: 'Adding 15 and 27: 15 + 27 = 42'
      },
      {
        question: 'What is the square root of 64?',
        options: ['6', '7', '8', '9'],
        correctAnswer: 2,
        explanation: 'The square root of 64 is 8 because 8 × 8 = 64'
      },
      {
        question: 'What is 12 × 8?',
        options: ['94', '95', '96', '97'],
        correctAnswer: 2,
        explanation: '12 × 8 = 96'
      },
      {
        question: 'What is 144 ÷ 12?',
        options: ['11', '12', '13', '14'],
        correctAnswer: 1,
        explanation: '144 ÷ 12 = 12'
      },
      {
        question: 'What is 25% of 80?',
        options: ['15', '20', '25', '30'],
        correctAnswer: 1,
        explanation: '25% of 80 = (25/100) × 80 = 20'
      }
    ],
    'Physics': [
      {
        question: 'What is the speed of light in vacuum?',
        options: ['3 × 10⁸ m/s', '3 × 10⁷ m/s', '3 × 10⁹ m/s', '3 × 10⁶ m/s'],
        correctAnswer: 0,
        explanation: 'The speed of light in vacuum is approximately 3 × 10⁸ meters per second'
      },
      {
        question: 'What is the unit of force?',
        options: ['Joule', 'Newton', 'Watt', 'Pascal'],
        correctAnswer: 1,
        explanation: 'Newton (N) is the SI unit of force, named after Sir Isaac Newton'
      },
      {
        question: 'What is the acceleration due to gravity on Earth?',
        options: ['9.8 m/s²', '10.8 m/s²', '8.8 m/s²', '11.8 m/s²'],
        correctAnswer: 0,
        explanation: 'The acceleration due to gravity on Earth is approximately 9.8 m/s²'
      },
      {
        question: 'Which law states that every action has an equal and opposite reaction?',
        options: ['First Law', 'Second Law', 'Third Law', 'Fourth Law'],
        correctAnswer: 2,
        explanation: 'Newton\'s Third Law states that for every action, there is an equal and opposite reaction'
      }
    ],
    'Chemistry': [
      {
        question: 'What is the chemical symbol for water?',
        options: ['H₂O', 'CO₂', 'NaCl', 'CH₄'],
        correctAnswer: 0,
        explanation: 'Water is composed of two hydrogen atoms and one oxygen atom, hence H₂O'
      },
      {
        question: 'What is the atomic number of carbon?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        explanation: 'Carbon has 6 protons in its nucleus, so its atomic number is 6'
      },
      {
        question: 'What is the most abundant gas in Earth\'s atmosphere?',
        options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
        correctAnswer: 2,
        explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere'
      }
    ],
    'Biology': [
      {
        question: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Body'],
        correctAnswer: 1,
        explanation: 'Mitochondria are called the powerhouse of the cell because they produce ATP (energy)'
      },
      {
        question: 'How many chambers does a human heart have?',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
        explanation: 'The human heart has 4 chambers: 2 atria and 2 ventricles'
      },
      {
        question: 'What is the basic unit of life?',
        options: ['Tissue', 'Organ', 'Cell', 'Organism'],
        correctAnswer: 2,
        explanation: 'The cell is the basic structural and functional unit of all living organisms'
      }
    ],
    'History': [
      {
        question: 'In which year did India gain independence?',
        options: ['1946', '1947', '1948', '1949'],
        correctAnswer: 1,
        explanation: 'India gained independence from British rule on August 15, 1947'
      },
      {
        question: 'Who was the first Prime Minister of India?',
        options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'Dr. Rajendra Prasad'],
        correctAnswer: 1,
        explanation: 'Jawaharlal Nehru was the first Prime Minister of independent India'
      }
    ],
    'Geography': [
      {
        question: 'Which is the largest continent?',
        options: ['Africa', 'Asia', 'North America', 'Europe'],
        correctAnswer: 1,
        explanation: 'Asia is the largest continent by both area and population'
      },
      {
        question: 'What is the capital of Australia?',
        options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
        correctAnswer: 2,
        explanation: 'Canberra is the capital city of Australia'
      }
    ],
    'English': [
      {
        question: 'What is the plural of "child"?',
        options: ['Childs', 'Children', 'Childes', 'Child'],
        correctAnswer: 1,
        explanation: 'The plural form of "child" is "children"'
      },
      {
        question: 'Which is a noun in this sentence: "The cat runs quickly"?',
        options: ['The', 'cat', 'runs', 'quickly'],
        correctAnswer: 1,
        explanation: 'A noun is a person, place, or thing. "Cat" is a noun in this sentence'
      }
    ],
    'Computer Science': [
      {
        question: 'What does HTML stand for?',
        options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink and Text Markup Language'],
        correctAnswer: 0,
        explanation: 'HTML stands for Hyper Text Markup Language, used for creating web pages'
      },
      {
        question: 'Which of these is a programming language?',
        options: ['HTML', 'CSS', 'JavaScript', 'All of the above'],
        correctAnswer: 3,
        explanation: 'HTML, CSS, and JavaScript are all used in web development, though HTML and CSS are markup/styling languages'
      }
    ]
  };

  return templates[subject] || templates['Mathematics'];
}

function generateFallbackQuiz(subject: string, difficulty: string, language: string, numQuestions: number) {
  // Simple fallback quiz
  return [
    {
      question: `What is a key concept in ${subject}?`,
      options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
      correctAnswer: 0,
      explanation: `This is a fundamental concept in ${subject} that students should understand.`
    },
    {
      question: `Which of these is important for learning ${subject}?`,
      options: ['Practice', 'Theory', 'Application', 'All of the above'],
      correctAnswer: 3,
      explanation: `Learning ${subject} requires a combination of practice, theory, and practical application.`
    },
    {
      question: `What difficulty level is this quiz?`,
      options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      correctAnswer: difficulty === 'beginner' ? 0 : difficulty === 'intermediate' ? 1 : 2,
      explanation: `This quiz is designed for ${difficulty} level students.`
    }
  ].slice(0, numQuestions);
}

export async function detectLanguage(text: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'en';
  }
}