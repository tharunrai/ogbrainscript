import { YoutubeTranscript } from "youtube-transcript";
import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

const isYouTubeId = (str) => /^[A-Za-z0-9_-]{11}$/.test(str);

export async function GET(request, { params }) {
  const { videoId } = params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") || "en";

  if (!isYouTubeId(videoId)) {
    return NextResponse.json(
      { error: "Invalid YouTube videoId." },
      { status: 400 }
    );
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: lang,
    });

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: `Transcript not found for videoId=${videoId} in lang=${lang}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ videoId, transcript });
  } catch (e) {
    console.error("Transcript fetch error:", e);

    if (e.message?.includes("disabled")) {
      return NextResponse.json(
        { error: "Transcripts are disabled." },
        { status: 403 }
      );
    }
    if (e.message?.includes("not found")) {
      return NextResponse.json(
        { error: "Transcript not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error while fetching transcript.",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
