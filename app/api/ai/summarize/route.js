import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const cleanTranscript = (transcript) => {
  if (Array.isArray(transcript)) {
    return transcript.map((item) => item.text).join(" ");
  }
  if (typeof transcript === "string") {
    return transcript.replace(/\[.*?\]/g, "").trim();
  }
  return "";
};

export async function POST(request) {
  try {
    const apiKey = process.env.SUMMARY_API_KEY;
    if (!apiKey) {
      console.error("SUMMARY_API_KEY is missing");
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key" },
        { status: 500 }
      );
    }

    const { transcript } = await request.json();
    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const cleanedText = cleanTranscript(transcript);
    if (!cleanedText) {
      return NextResponse.json(
        { error: "Transcript is empty" },
        { status: 400 }
      );
    }

    const truncatedText = cleanedText.substring(0, 30000);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert teacher. Your goal is to teach the content of this video transcript to a student.
    
    Instructions:
    1. **Filter Noise**: Ignore filler words, off-topic banter, and self-promotion. Focus only on the core educational content.
    2. **Direct Teaching**: Do NOT use phrases like "The speaker says" or "In this video". Teach the concepts directly as if you are the instructor.
    3. **Structure**:
       - **Key Topics**: List the main topics discussed.
       - **Core Concepts**: Explain the important ideas in simple terms.
       - **Questions Addressed**: List any specific questions or problems solved.
    4. **Format**: Use clear headings and bullet points. Keep it concise and easy to read.

    Transcript:
    ${truncatedText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
