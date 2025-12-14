
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const videoId = 'zWU4wnKi62M'; // Utility Model
        const video = await prisma.video.findFirst({
            where: { videoId },
            include: { transcript: true }
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" });
        }

        if (!video.transcript) {
            return NextResponse.json({ error: "Transcript relation is null" });
        }

        const rawSegments = video.transcript.segments;

        // Check if it is double stringified
        let parsedOnce;
        try {
            parsedOnce = JSON.parse(rawSegments);
        } catch (e) {
            return NextResponse.json({
                status: "Is not JSON",
                rawType: typeof rawSegments,
                preview: rawSegments.slice(0, 100)
            });
        }

        const isArray = Array.isArray(parsedOnce);
        let parsedTwice = null;
        let isDoubleStringified = false;

        if (typeof parsedOnce === 'string') {
            try {
                parsedTwice = JSON.parse(parsedOnce);
                isDoubleStringified = true;
            } catch (e) {
                // Not double stringified
            }
        }

        return NextResponse.json({
            rawType: typeof rawSegments,
            rawLength: rawSegments.length,
            parsedOnceType: typeof parsedOnce,
            isArray,
            isDoubleStringified,
            firstItem: isArray ? parsedOnce[0] : null,
            firstItemType: isArray ? typeof parsedOnce[0] : null,
            doubleParsedFirstItem: isDoubleStringified ? parsedTwice[0] : null
        });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
