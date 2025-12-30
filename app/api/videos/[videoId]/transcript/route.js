import { NextResponse } from "next/server";
import { runPython } from "@/lib/utils/runPython";

const isYouTubeId = (str) => /^[A-Za-z0-9_-]{11}$/.test(str);

export async function GET(request, { params }) {
  const { videoId } = await params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") || "en";

  if (!isYouTubeId(videoId)) {
    return NextResponse.json(
      { error: "Invalid YouTube videoId." },
      { status: 400 }
    );
  }

  try {
    // Use Python script for more reliable transcript fetching
    const langs = lang.split(",").map(l => l.trim()).join(",");
    console.log(`[Transcript API] Fetching transcript for ${videoId} with langs: ${langs}`);
    
    const result = await runPython("fetch_transcript.py", [videoId, langs]);
    console.log(`[Transcript API] Python result:`, result);

    if (result.error) {
      console.error(`[Transcript API] Python returned error:`, result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ videoId, transcript: result });
  } catch (e) {
    console.error("Transcript fetch error:", e);
    console.error("Error stack:", e.stack);

    return NextResponse.json(
      {
        error: "Internal server error while fetching transcript.",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
