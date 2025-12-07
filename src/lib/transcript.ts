import { YoutubeTranscript, TranscriptResponse } from "youtube-transcript";

// トランスクリプトセグメントの型定義
export interface TranscriptSegment {
  text: string;
  start: number; // 開始時間（秒）
  duration: number; // 表示時間（秒）
}

// YouTubeの字幕を取得
export async function getTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  try {
    const transcriptItems: TranscriptResponse[] =
      await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "ja", // 日本語優先
      });

    return transcriptItems.map((item) => ({
      text: item.text,
      start: item.offset / 1000, // ミリ秒から秒に変換
      duration: item.duration / 1000,
    }));
  } catch {
    // 日本語がない場合は英語を試す
    try {
      const transcriptItems: TranscriptResponse[] =
        await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        });

      return transcriptItems.map((item) => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000,
      }));
    } catch {
      // 言語指定なしで再試行
      try {
        const transcriptItems: TranscriptResponse[] =
          await YoutubeTranscript.fetchTranscript(videoId);

        return transcriptItems.map((item) => ({
          text: item.text,
          start: item.offset / 1000,
          duration: item.duration / 1000,
        }));
      } catch (error) {
        console.error(`Failed to fetch transcript for ${videoId}:`, error);
        return [];
      }
    }
  }
}

// トランスクリプトを全文テキストに変換
export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}

// タイムスタンプをフォーマット（秒 -> MM:SS または HH:MM:SS）
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
