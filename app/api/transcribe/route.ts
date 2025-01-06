import { NextResponse } from 'next/server'

interface PronunciationResult {
  transcript: string;
  confidence: number;
  pronunciationScore: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result: PronunciationResult = data;

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        feedback: getPronunciationFeedback(result.pronunciationScore)
      }
    });
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}

function getPronunciationFeedback(score: number): string {
  if (score >= 0.9) return "Excellent pronunciation!";
  if (score >= 0.7) return "Good pronunciation with minor improvements needed";
  if (score >= 0.5) return "Fair pronunciation - keep practicing";
  return "Needs improvement - try speaking more clearly";
}
