import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const videoId = request.nextUrl.searchParams.get("videoId");
        if (!videoId) {
            // Just get the first video with transcript
            const video = await prisma.video.findFirst({
                where: { transcript: { isNot: null } },
                include: { transcript: true },
            });
            if (!video) return NextResponse.json({ message: "No videos found" });

            const segments = JSON.parse(video.transcript!.segments);
            return NextResponse.json({
                videoId: video.id,
                title: video.title,
                firstSegments: segments.slice(0, 5)
            });
        }

        const video = await prisma.video.findUnique({
            where: { id: videoId },
            include: { transcript: true },
        });

        if (!video || !video.transcript) {
            return NextResponse.json({ message: "Video not found or no transcript" });
        }

        const segments = JSON.parse(video.transcript.segments);
        return NextResponse.json({
            videoId: video.id,
            title: video.title,
            firstSegments: segments.slice(0, 5)
        });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
