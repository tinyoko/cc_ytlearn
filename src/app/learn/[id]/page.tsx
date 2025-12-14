import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LearnClient } from "./learn-client";
import type { TranscriptSegment } from "@/types/transcript";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LearnPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect("/login");
  }

  // 動画データを取得
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      transcript: true,
      chapters: {
        orderBy: { order: "asc" },
      },
      user: {
        select: { email: true },
      },
    },
  });

  if (!video) {
    notFound();
  }

  // 権限チェック
  if (video.user.email !== session.user?.email) {
    redirect("/dashboard");
  }

  // トランスクリプトをパース
  let segments: TranscriptSegment[] = [];
  if (video.transcript?.segments) {
    try {
      segments = JSON.parse(video.transcript.segments);
    } catch {
      segments = [];
    }
  }

  return (
    <LearnClient
      video={{
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        duration: video.duration,
      }}
      transcript={segments}
      chapters={video.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        startTime: c.startTime,
        summary: c.summary,
      }))}
    />
  );
}
