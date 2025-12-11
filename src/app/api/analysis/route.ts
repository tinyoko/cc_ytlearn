import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { defaultModel } from "@/lib/ai";

// スキル定義（skill.mdの内容を反映）
const SYSTEM_PROMPT = `あなたはYouTube動画のトランスクリプトを分析する専門家です。
与えられたトランスクリプトを読み、以下のタスクを実行してください：

1. 動画の内容を理解し、トピックの変化点を特定する
2. 各セクションに適切なチャプタータイトルを付ける
3. 各チャプターと動画全体の要約を作成する

チャプター分割の基準：
- トピックの変化: 話題が明確に変わる箇所で分割
- 最小長さ: 各チャプターは最低30秒以上
- 最大長さ: 各チャプターは最長10分以下
- チャプター数: 動画の長さに応じて3〜15個程度

チャプタータイトルの命名規則：
- 15文字以内を目標
- そのセクションの内容を明確に表現
- 日本語の動画は日本語で

重要な注意点：
- タイムスタンプは秒単位で指定してください
- チャプターの開始時間は、そのトピックが始まる正確な位置を示す必要があります

必ず以下のJSON形式のみで応答してください。他のテキストは含めないでください。

{
  "chapters": [
    {
      "title": "string",
      "startTime": number,
      "summary": "string"
    }
  ],
  "overallSummary": "string"
}`;

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface AnalysisResult {
  chapters: {
    title: string;
    startTime: number;
    summary: string;
  }[];
  overallSummary: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
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

    // トランスクリプトをフォーマット（タイムスタンプ付き）
    const formattedTranscript = formatTranscriptForAnalysis(segments);

    // LLMで分析
    const { text } = await generateText({
      model: defaultModel,
      system: SYSTEM_PROMPT,
      prompt: `以下は「${video.title}」という動画のトランスクリプトです。分析してチャプターと要約を生成してください。

動画の長さ: ${video.duration ? Math.floor(video.duration / 60) + "分" : "不明"}

トランスクリプト:
${formattedTranscript}`,
    });

    // JSONをパース
    let analysisResult: AnalysisResult;
    try {
      // JSONブロックを抽出（```json ... ``` 形式の場合に対応）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text];
      const jsonStr = jsonMatch[1] || text;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse LLM response:", text);
      return NextResponse.json(
        { error: "Failed to parse analysis result" },
        { status: 500 }
      );
    }

    // チャプターをデータベースに保存
    // 既存のチャプターを削除
    await prisma.chapter.deleteMany({
      where: { videoId: video.id },
    });

    // 新しいチャプターを作成
    await prisma.chapter.createMany({
      data: analysisResult.chapters.map((chapter, index) => ({
        videoId: video.id,
        title: chapter.title,
        startTime: chapter.startTime,
        summary: chapter.summary,
        order: index,
      })),
    });

    // 動画のサマリーを更新
    await prisma.video.update({
      where: { id: video.id },
      data: {
        summary: analysisResult.overallSummary,
        analyzedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      chapters: analysisResult.chapters,
      overallSummary: analysisResult.overallSummary,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}

// トランスクリプトを分析用にフォーマット
function formatTranscriptForAnalysis(segments: TranscriptSegment[]): string {
  // セグメントをグループ化して読みやすくする
  const lines: string[] = [];
  let currentText = "";
  let currentStart = 0;

  for (const segment of segments) {
    if (currentText === "") {
      currentStart = segment.start;
    }
    currentText += segment.text + " ";

    // 一定の長さまたは文末で区切る
    if (
      currentText.length > 200 ||
      segment.text.match(/[。．！？.!?]$/)
    ) {
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
