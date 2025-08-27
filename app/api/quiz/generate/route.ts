import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Quiz from '../../../../models/Quiz';
import { generateQuiz } from '../../../../lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, difficulty, language = 'en', numQuestions = 5 } = await request.json();

    if (!subject || !difficulty) {
      return NextResponse.json(
        { error: 'Subject and difficulty are required' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (numQuestions < 1 || numQuestions > 20) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 20' },
        { status: 400 }
      );
    }
    await connectDB();

    try {
      // Generate quiz using Gemini AI
      console.log('Generating quiz:', { subject, difficulty, language, numQuestions });
      const quizQuestions = await generateQuiz(subject, difficulty, language, numQuestions);
      console.log('Quiz generated successfully with', quizQuestions.length, 'questions');

      // Create quiz document
      const quiz = new Quiz({
        userId: session.user.id,
        title: `${subject} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz`,
        subject,
        difficulty,
        language,
        questions: quizQuestions,
      });

      await quiz.save();

      return NextResponse.json({
        id: quiz._id,
        title: quiz.title,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        language: quiz.language,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
      });
    } catch (aiError) {
      console.error('AI quiz generation error:', aiError);
      return NextResponse.json(
        { error: typeof aiError === 'object' && aiError !== null && 'message' in aiError ? (aiError as { message?: string }).message : 'Failed to generate quiz. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate quiz error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}