import ytdl from "@distube/ytdl-core";
import { NextResponse } from "next/server";

const isYouTubeId = (str) => /^[A-Za-z0-9_-]{11}$/.test(str);

export async function GET(request, { params }) {
  const { videoId } = await params;

  if (!isYouTubeId(videoId)) {
    return NextResponse.json(
      { error: "Invalid YouTube videoId." },
      { status: 400 }
    );
  }

  try {
    const info = await ytdl.getBasicInfo(videoId);
    const details = info.videoDetails;

    return NextResponse.json({
      videoId,
      title: details.title,
      author: details.author.name,
      lengthSeconds: details.lengthSeconds,
      thumbnails: details.thumbnails,
    });
  } catch (e) {
    console.error("Video details fetch error:", e);
    return NextResponse.json(
      {
        error: "Failed to fetch video details",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
