import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import Quiz from '../../../models/Quiz';

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
    const completed = searchParams.get('completed');

    await connectDB();

    const query: any = { userId: session.user.id };
    if (subject) {
      query.subject = subject;
    }
    if (completed !== null) {
      if (completed === 'true') {
        query.completedAt = { $exists: true };
      } else if (completed === 'false') {
        query.completedAt = { $exists: false };
      }
    }

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .select('-questions.explanation') // Don't send explanations in list view
      .lean();

    const total = await Quiz.countDocuments(query);

    return NextResponse.json({
      quizzes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}