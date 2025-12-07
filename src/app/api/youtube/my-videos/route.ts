import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getYouTubeClient, parseDuration, YouTubeVideo } from "@/lib/youtube";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const youtube = getYouTubeClient(session.accessToken);

    // ユーザーのチャンネル情報を取得
    const channelResponse = await youtube.channels.list({
      part: ["contentDetails"],
      mine: true,
    });

    const uploadsPlaylistId =
      channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: "アップロード動画が見つかりません" },
        { status: 404 }
      );
    }

    // アップロード動画の一覧を取得
    const playlistItemsResponse = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
    });

    const videoIds =
      playlistItemsResponse.data.items
        ?.map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => !!id) || [];

    if (videoIds.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // 動画の詳細情報を取得
    const videosResponse = await youtube.videos.list({
      part: ["snippet", "contentDetails", "status"],
      id: videoIds,
    });

    const videos: YouTubeVideo[] =
      videosResponse.data.items?.map((item) => ({
        videoId: item.id || "",
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        duration: parseDuration(item.contentDetails?.duration || ""),
        publishedAt: item.snippet?.publishedAt || "",
        privacyStatus: item.status?.privacyStatus || "",
      })) || [];

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      { error: "動画の取得に失敗しました" },
      { status: 500 }
    );
  }
}
