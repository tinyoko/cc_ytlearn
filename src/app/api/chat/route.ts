import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamText } from "ai";
import { defaultModel } from "@/lib/ai";

// ChatAgent用システムプロンプト
const SYSTEM_PROMPT = `あなたはYouTube動画の内容に関する質問に答えるアシスタントです。

以下のルールに従って回答してください：

1. 回答は必ず提供されたトランスクリプトの内容のみに基づいてください
2. 回答に関連する動画の時間を「MM:SS」形式で示してください（例：「3:45から説明されています」）
3. トランスクリプトに情報がない場合は、正直に「動画内でその情報は見つかりませんでした」と答えてください
4. 専門用語は必要に応じて簡潔に説明してください
5. 回答は日本語で、簡潔かつ明確に行ってください
6. タイムスタンプを示す際は、ユーザーがクリックできるように「MM:SS」形式で記載してください`;

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, message, history = [] } = body as {
      videoId: string;
      message: string;
      history?: ChatMessage[];
    };

    if (!videoId || !message) {
      return NextResponse.json(
        { error: "Video ID and message are required" },
        { status: 400 }
      );
    }

    // 動画とトランスクリプトを取得
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcript: true,
        user: { select: { email: true } },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 権限チェック
    if (video.user.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // トランスクリプトがない場合
    if (!video.transcript?.segments) {
      return NextResponse.json(
        { error: "Transcript not available" },
        { status: 400 }
      );
    }

    // トランスクリプトをパース
    let segments: TranscriptSegment[] = [];
    try {
      segments = JSON.parse(video.transcript.segments);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse transcript" },
        { status: 500 }
      );
    }

    // トランスクリプトをフォーマット
    const formattedTranscript = formatTranscriptForChat(segments);

    // 会話履歴を構築
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...history,
      { role: "user" as const, content: message },
    ];

    // ストリーミングレスポンスを生成
    const result = streamText({
      model: defaultModel,
      system: `${SYSTEM_PROMPT}

動画タイトル: ${video.title}

以下は動画のトランスクリプトです。この内容に基づいて質問に回答してください。

---
${formattedTranscript}
---`,
      messages,
    });

    // ストリーミングレスポンスを返す
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Chat processing failed" },
      { status: 500 }
    );
  }
}

// トランスクリプトをチャット用にフォーマット
function formatTranscriptForChat(segments: TranscriptSegment[]): string {
  const lines: string[] = [];
  let currentText = "";
  let currentStart = 0;

  for (const segment of segments) {
    if (currentText === "") {
      currentStart = segment.start;
    }
    currentText += segment.text + " ";

    // 一定の長さまたは文末で区切る
    if (currentText.length > 150 || segment.text.match(/[。．！？.!?]$/)) {
      const timestamp = formatTimestamp(currentStart);
      lines.push(`[${timestamp}] ${currentText.trim()}`);
      currentText = "";
    }
  }

  // 残りのテキスト
  if (currentText.trim()) {
    const timestamp = formatTimestamp(currentStart);
    lines.push(`[${timestamp}] ${currentText.trim()}`);
  }

  return lines.join("\n");
}

// 秒数を MM:SS 形式に変換
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
