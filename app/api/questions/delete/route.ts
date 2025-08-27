import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Question from '../../../../models/Question';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionIds, deleteAll } = await request.json();

    if (!questionIds && !deleteAll) {
      return NextResponse.json(
        { error: 'Question IDs or deleteAll flag is required' },
        { status: 400 }
      );
    }

    await connectDB();

    let result;
    
    if (deleteAll) {
      // Delete all questions for the user
      result = await Question.deleteMany({ userId: session.user.id });
    } else if (Array.isArray(questionIds) && questionIds.length > 0) {
      // Delete specific questions
      result = await Question.deleteMany({
        _id: { $in: questionIds },
        userId: session.user.id, // Ensure user can only delete their own questions
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} question${result.deletedCount !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Delete questions error:', error);
    return NextResponse.json(
      { error: 'Failed to delete questions' },
      { status: 500 }
    );
  }
}