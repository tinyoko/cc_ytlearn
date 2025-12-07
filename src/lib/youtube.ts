import { google, youtube_v3 } from "googleapis";

// YouTube Data API クライアントを初期化
export function getYouTubeClient(accessToken: string): youtube_v3.Youtube {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.youtube({
    version: "v3",
    auth,
  });
}

// 動画情報の型定義
export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // 秒
  publishedAt: string;
  privacyStatus: string;
}

// プレイリスト情報の型定義
export interface YouTubePlaylist {
  playlistId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  itemCount: number;
}

// ISO 8601 duration を秒に変換
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// YouTubeプレイリストURLからIDを抽出
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([^&]+)/, // 通常のURL
    /^(PL[a-zA-Z0-9_-]+)$/, // プレイリストIDのみ
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// YouTube動画URLからIDを抽出
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // 動画IDのみ
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
