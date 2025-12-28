import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId, videoTitle, score, totalQuestions, difficulty, topics } = 
      await request.json();

    await connectDB();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add to history
    user.quizHistory.push({
      date: new Date(),
      videoId,
      videoTitle,
      score,
      totalQuestions,
      difficulty,
    });

    // Update stats
    if (!user.stats) {
      user.stats = {
        totalWatchTime: 0,
        totalQuizzesSolved: 0,
        topicsCleared: [],
      };
    }
    user.stats.totalQuizzesSolved += 1;

    // Add topics cleared if high score
    if (topics && score / totalQuestions >= 0.7) {
      topics.forEach((topic) => {
        if (!user.stats.topicsCleared.includes(topic)) {
          user.stats.topicsCleared.push(topic);
        }
      });
    }

    await user.save();

    return NextResponse.json({ success: true, quizHistory: user.quizHistory });
  } catch (error) {
    console.error("Save Quiz Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
