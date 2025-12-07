import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getYouTubeClient,
  parseDuration,
  extractPlaylistId,
  YouTubeVideo,
} from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const playlistUrl = searchParams.get("url");

    if (!playlistUrl) {
      return NextResponse.json(
        { error: "プレイリストURLが必要です" },
        { status: 400 }
      );
    }

    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
      return NextResponse.json(
        { error: "無効なプレイリストURLです" },
        { status: 400 }
      );
    }

    const youtube = getYouTubeClient(session.accessToken);

    // プレイリスト情報を取得
    const playlistResponse = await youtube.playlists.list({
      part: ["snippet"],
      id: [playlistId],
    });

    const playlistInfo = playlistResponse.data.items?.[0];

    if (!playlistInfo) {
      return NextResponse.json(
        { error: "プレイリストが見つかりません" },
        { status: 404 }
      );
    }

    // プレイリスト内の動画一覧を取得
    const allVideoIds: string[] = [];
    let nextPageToken: string | undefined;

    do {
      const playlistItemsResponse = await youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      });

      const videoIds =
        playlistItemsResponse.data.items
          ?.map((item) => item.contentDetails?.videoId)
          .filter((id): id is string => !!id) || [];

      allVideoIds.push(...videoIds);
      nextPageToken = playlistItemsResponse.data.nextPageToken || undefined;
    } while (nextPageToken && allVideoIds.length < 200); // 最大200件

    if (allVideoIds.length === 0) {
      return NextResponse.json({
        playlist: {
          id: playlistId,
          title: playlistInfo.snippet?.title || "",
        },
        videos: [],
      });
    }

    // 動画の詳細情報を取得（50件ずつ）
    const videos: YouTubeVideo[] = [];

    for (let i = 0; i < allVideoIds.length; i += 50) {
      const chunk = allVideoIds.slice(i, i + 50);
      const videosResponse = await youtube.videos.list({
        part: ["snippet", "contentDetails", "status"],
        id: chunk,
      });

      const chunkVideos: YouTubeVideo[] =
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

      videos.push(...chunkVideos);
    }

    return NextResponse.json({
      playlist: {
        id: playlistId,
        title: playlistInfo.snippet?.title || "",
      },
      videos,
    });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      { error: "プレイリストの取得に失敗しました" },
      { status: 500 }
    );
  }
}
