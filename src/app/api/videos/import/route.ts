import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranscript, transcriptToText } from "@/lib/transcript";
import { YouTubeVideo } from "@/lib/youtube";

interface ImportRequest {
  videos: YouTubeVideo[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // ユーザーを取得または作成
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
    }

    const body: ImportRequest = await request.json();
    const { videos } = body;

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: "インポートする動画を選択してください" },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { videoId: string; error: string }[],
      skipped: [] as string[],
    };

    for (const video of videos) {
      try {
        // 既存の動画をチェック
        const existingVideo = await prisma.video.findUnique({
          where: {
            userId_videoId: {
              userId: user.id,
              videoId: video.videoId,
            },
          },
        });

        if (existingVideo) {
          results.skipped.push(video.videoId);
          continue;
        }

        // トランスクリプトを取得
        console.log(`[Import Debug] Fetching transcript for ${video.videoId}...`);
        const segments = await getTranscript(video.videoId);
        console.log(`[Import Debug] Fetched ${segments.length} segments.`);
        if (segments.length > 0) {
          console.log(`[Import Debug] First segment:`, JSON.stringify(segments[0]));
        } else {
          console.log(`[Import Debug] No segments returned.`);
        }

        const fullText = transcriptToText(segments);

        // 動画とトランスクリプトを保存
        await prisma.video.create({
          data: {
            videoId: video.videoId,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
            privacyStatus: video.privacyStatus,
            userId: user.id,
            transcript:
              segments.length > 0
                ? {
                  create: {
                    segments: JSON.stringify(segments),
                    fullText,
                  },
                }
                : undefined,
          },
        });

        results.success.push(video.videoId);
      } catch (error) {
        console.error(`Failed to import video ${video.videoId}:`, error);
        results.failed.push({
          videoId: video.videoId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: "インポート完了",
      results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "インポートに失敗しました" },
      { status: 500 }
    );
  }
}
