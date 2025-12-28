import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      // Fail silently for tracking
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { appOpenTime, watchTime, videoId } = await request.json();

    await connectDB();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    let todayActivity = user.dailyActivity.find((a) => a.date === today);

    if (!todayActivity) {
      todayActivity = {
        date: today,
        watchTime: 0,
        appOpenTime: 0,
        videosWatched: [],
        loginCount: 0,
      };
      user.dailyActivity.push(todayActivity);
    }

    if (appOpenTime) {
      todayActivity.appOpenTime += appOpenTime;
    }

    if (watchTime) {
      todayActivity.watchTime += watchTime;
      if (!user.stats) user.stats = { totalWatchTime: 0, totalQuizzesSolved: 0, topicsCleared: [] };
      user.stats.totalWatchTime += watchTime;
    }

    if (videoId && !todayActivity.videosWatched.includes(videoId)) {
      todayActivity.videosWatched.push(videoId);
    }

    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
