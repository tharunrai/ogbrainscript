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
    const apiKey = process.env.QUIZ_API_KEY;
    if (!apiKey) {
      console.error("QUIZ_API_KEY is missing");
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key" },
        { status: 500 }
      );
    }

    const { transcript, summary, difficulty = "medium" } = await request.json();

    let sourceText = "";
    if (summary && typeof summary === "string" && summary.trim().length > 0) {
      sourceText = summary;
    } else if (transcript) {
      sourceText = cleanTranscript(transcript);
    }

    if (!sourceText) {
      return NextResponse.json(
        { error: "Summary or Transcript is required" },
        { status: 400 }
      );
    }

    const truncatedText = sourceText.substring(0, 30000);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `You are an expert quiz creator. Based on the following educational content, generate a multiple-choice quiz.

    Difficulty: ${difficulty}

    Requirements:
    1. Generate 5-10 questions based on the content
    2. Each question should have 4 options (A, B, C, D)
    3. Indicate the correct answer
    4. Make questions challenging but fair
    5. Focus on key concepts and important details

    Return ONLY valid JSON in this exact format:
    {
      "questions": [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Brief explanation"
        }
      ]
    }

    Content:
    ${truncatedText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean JSON markers if present
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const quizData = JSON.parse(text);

    return NextResponse.json(quizData);
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz. Please try again." },
      { status: 500 }
    );
  }
}
