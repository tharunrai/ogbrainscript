import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Continue Watching
    const continueWatching = user.learningProgress || [];

    // 2. Smart Review (Low score quizzes)
    // Filter for quizzes with score < 60%
    const lowScoreQuizzes = (user.quizHistory || [])
      .filter((q) => q.totalQuestions > 0 && q.score / q.totalQuestions < 0.6)
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Most recent first
      .slice(0, 10); // Limit to 10

    // Map to a cleaner format
    const smartReview = lowScoreQuizzes.map((q) => ({
      videoId: q.videoId,
      title: q.videoTitle || "Unknown Video",
      score: q.score,
      totalQuestions: q.totalQuestions,
      date: q.date,
    }));

    return NextResponse.json({
      continueWatching,
      smartReview,
    });
  } catch (error) {
    console.error("Learning History Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
