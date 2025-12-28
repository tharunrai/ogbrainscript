import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize fields if missing
    if (!user.stats) {
      user.stats = {
        totalWatchTime: 0,
        totalQuizzesSolved: 0,
        topicsCleared: [],
      };
    }
    if (!user.dailyActivity) user.dailyActivity = [];
    if (!user.quizHistory) user.quizHistory = [];

    // Calculate Streak
    let streak = 0;
    const sortedActivity = user.dailyActivity.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    if (sortedActivity.length > 0) {
      const lastActive = sortedActivity[0].date;
      if (lastActive === today || lastActive === yesterday) {
        streak = 1;
        for (let i = 1; i < sortedActivity.length; i++) {
          const prevDate = new Date(sortedActivity[i - 1].date);
          const currDate = new Date(sortedActivity[i].date);
          const diffTime = Math.abs(prevDate - currDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return NextResponse.json({
      stats: user.stats,
      dailyActivity: user.dailyActivity,
      quizHistory: user.quizHistory,
      streak,
      user: {
        name: user.name,
        email: user.email,
        picture: user.picture,
        lastLogin: user.lastLogin,
        accountType: user.accountType,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
