import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // ユーザーの動画を取得
  let videos: {
    id: string;
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    duration: number | null;
    createdAt: Date;
  }[] = [];

  if (session.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        videos: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            videoId: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });
    videos = user?.videos || [];
  }

  return (
    <DashboardClient
      user={{
        name: session.user?.name || null,
        image: session.user?.image || null,
      }}
      initialVideos={videos}
    />
  );
}
