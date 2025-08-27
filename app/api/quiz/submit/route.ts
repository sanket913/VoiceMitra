import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Quiz from '../../../../models/Quiz';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId, answers } = await request.json();

    if (!quizId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Quiz ID and answers are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const quiz = await Quiz.findOne({
      _id: quizId,
      userId: session.user.id,
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    answers.forEach((answer: number, index: number) => {
      if (quiz.questions[index] && quiz.questions[index].correctAnswer === answer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Update quiz with user answers and score
    quiz.userAnswers = answers;
    quiz.score = score;
    quiz.completedAt = new Date();

    await quiz.save();

    return NextResponse.json({
      score,
      correctAnswers,
      totalQuestions,
      results: quiz.questions.map((question: { question: any; options: any; correctAnswer: any; explanation: any; }, index: number) => ({
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: answers[index],
        isCorrect: question.correctAnswer === answers[index],
        explanation: question.explanation,
      })),
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}