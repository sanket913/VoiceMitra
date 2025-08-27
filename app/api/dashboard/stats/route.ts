import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Question from '../../../../models/Question';
import Quiz from '../../../../models/Quiz';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    await connectDB();

    const userId = session.user.id;

    // Calculate date ranges based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get basic stats
    const [
      totalQuestions,
      totalQuizzes,
      completedQuizzes,
      recentQuestions,
      recentQuizzes,
    ] = await Promise.all([
      Question.countDocuments({ userId }),
      Quiz.countDocuments({ userId }),
      Quiz.countDocuments({ userId, completedAt: { $exists: true } }),
      Question.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('question subject language createdAt')
        .lean(),
      Quiz.find({ userId, completedAt: { $exists: true } })
        .sort({ completedAt: -1 })
        .limit(10)
        .select('title subject score completedAt language')
        .lean(),
    ]);

    // Calculate average score
    const quizzesWithScores = await Quiz.find({
      userId,
      score: { $exists: true },
    }).select('score').lean();

    const averageScore = quizzesWithScores.length > 0
      ? Math.round(quizzesWithScores.reduce((sum, quiz) => sum + quiz.score, 0) / quizzesWithScores.length)
      : 0;

    // Calculate learning streak and weekly activity data
    const last7Days = [];
    const today = new Date();
    let currentStreak = 0;
    let streakBroken = false;
    
    // Generate last 7 days data
    for (let i = 6; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(checkDate);
      nextDay.setDate(checkDate.getDate() + 1);
      
      // Get activity for this day
      const [dayQuestions, dayQuizzes] = await Promise.all([
        Question.countDocuments({
          userId,
          createdAt: {
            $gte: checkDate,
            $lt: nextDay
          }
        }),
        Quiz.countDocuments({
          userId,
          completedAt: {
            $gte: checkDate,
            $lt: nextDay,
            $exists: true
          }
        })
      ]);
      
      // Add to weekly data
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      last7Days.push({
        date: checkDate.toISOString().split('T')[0],
        day: dayNames[checkDate.getDay()],
        questions: dayQuestions,
        quizzes: dayQuizzes
      });
      
      // Calculate streak (from most recent day backwards)
      if (i <= 1 && !streakBroken) { // Only count today and yesterday for streak
        if (dayQuestions > 0 || dayQuizzes > 0) {
          currentStreak++;
        } else if (i === 0) {
          // No activity today, but check yesterday
          continue;
        } else {
          streakBroken = true;
        }
      }
    }

    // Calculate study time (estimated based on questions and quizzes)
    const studyTimeHours = Math.round((totalQuestions * 2 + completedQuizzes * 10) / 60 * 100) / 100;

    // Get subject distribution with better handling
    const subjectStats = await Question.aggregate([
      { $match: { userId } },
      { 
        $addFields: {
          subjectName: {
            $cond: {
              if: { $or: [{ $eq: ['$subject', null] }, { $eq: ['$subject', ''] }] },
              then: 'General',
              else: '$subject'
            }
          }
        }
      },
      { 
        $group: { 
          _id: '$subjectName', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get language distribution
    const languageStats = await Question.aggregate([
      { $match: { userId } },
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Calculate streak progress (percentage towards monthly goal of 20 days)
    const monthlyGoal = 20;
    const streakProgress = Math.min((currentStreak / monthlyGoal) * 100, 100);

    console.log('Dashboard Stats:', {
      totalQuestions,
      totalQuizzes,
      completedQuizzes,
      currentStreak,
      weeklyActivity: last7Days
    });
    return NextResponse.json({
      stats: {
        totalQuestions,
        totalQuizzes,
        completedQuizzes,
        averageScore,
        studyTimeHours,
        currentStreak,
        monthlyGoal,
        streakProgress,
      },
      recentActivity: {
        questions: recentQuestions,
        quizzes: recentQuizzes,
      },
      charts: {
        subjects: subjectStats,
        languages: languageStats,
        weeklyActivity: last7Days,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}