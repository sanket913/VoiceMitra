import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import Question from '../../../models/Question';
import { generateAnswer, detectLanguage } from '../../../lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, language, isVoiceInput = false } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Validate question length
    if (question.trim().length < 3) {
      return NextResponse.json({ error: 'Question is too short. Please provide a more detailed question.' }, { status: 400 });
    }
    await connectDB();

    // Detect language if not provided
    const detectedLanguage = language || await detectLanguage(question);

    try {
      // Generate answer using Gemini AI
      console.log('Generating answer for question:', question.substring(0, 50) + '...');
      const answer = await generateAnswer(question, detectedLanguage);
      console.log('Answer generated successfully');

      // Save question and answer to database
      const questionDoc = new Question({
        userId: session.user.id,
        question: question.trim(),
        answer,
        language: detectedLanguage,
        isVoiceInput,
      });

      await questionDoc.save();

      return NextResponse.json({
        id: questionDoc._id,
        question: questionDoc.question,
        answer: questionDoc.answer,
        language: questionDoc.language,
        createdAt: questionDoc.createdAt,
      });
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      const errorMessage =
        aiError && typeof aiError === 'object' && 'message' in aiError
          ? (aiError as { message?: string }).message
          : undefined;
      return NextResponse.json(
        { error: errorMessage || 'Failed to generate answer. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Question API error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const subject = searchParams.get('subject');

    await connectDB();

    const query: any = { userId: session.user.id };
    if (subject) {
      query.subject = subject;
    }

    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Question.countDocuments(query);

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}