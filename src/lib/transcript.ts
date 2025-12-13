import { Innertube } from "youtubei.js";

// トランスクリプトセグメントの型定義
export interface TranscriptSegment {
  text: string;
  start: number; // 開始時間（秒）
  duration: number; // 表示時間（秒）
}

// Innertubeインスタンスをキャッシュ
let innertubeInstance: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create();
  }
  return innertubeInstance;
}

// Innertube経由で字幕を取得（プライマリ）
async function getTranscriptFromInnertube(
  videoId: string
): Promise<TranscriptSegment[]> {
  const yt = await getInnertube();
  const info = await yt.getInfo(videoId);
  const transcriptInfo = await info.getTranscript();

  // トランスクリプトのセグメントを取得
  const segments =
    transcriptInfo?.transcript?.content?.body?.initial_segments || [];

  if (!segments || segments.length === 0) {
    throw new Error("No transcript segments found");
  }

  // デバッグ: 最初のセグメントの構造を確認
  if (segments.length > 0) {
    console.log(`[Transcript] First segment structure:`, JSON.stringify(segments[0], null, 2));
  }

  return segments
    .filter(
      (segment: unknown): segment is Record<string, any> => {
        return (
          segment !== null &&
          typeof segment === "object" &&
          "snippet" in segment
        );
      }
    )
    .map((segment, index) => {
      const snippet = segment.snippet as Record<string, any>;

      // youtubei.jsのバージョンや取得方法により、プロパティ名が異なる可能性がある
      // start_ms/end_ms (snake_case) または startMs/endMs (camelCase) を試す
      const startValue = snippet.start_ms ?? snippet.startMs ?? snippet.start_time_ms ?? snippet.startTimeMs ?? 0;
      const endValue = snippet.end_ms ?? snippet.endMs ?? snippet.end_time_ms ?? snippet.endTimeMs ?? 0;

      const startMs = typeof startValue === 'number' ? startValue : parseFloat(startValue) || 0;
      const endMs = typeof endValue === 'number' ? endValue : parseFloat(endValue) || 0;

      // 警告: タイムスタンプが取得できていない場合
      if (index === 0 && startMs === 0 && endMs === 0) {
        console.warn(`[Transcript] Warning: No timestamp data found. Available keys:`, Object.keys(snippet));
      }

      return {
        text: snippet.text || "",
        start: startMs / 1000,
        duration: Math.max(0, (endMs - startMs) / 1000),
      };
    });
}

// caption_tracksのbase_urlから直接XMLをフェッチして字幕を取得（フォールバック）
async function getTranscriptFromCaptionTracks(
  videoId: string
): Promise<TranscriptSegment[]> {
  const yt = await getInnertube();
  const info = await yt.getInfo(videoId);

  const captionTracks = info.captions?.caption_tracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks available");
  }

  // 日本語優先、なければ最初のトラック
  const jaTrack = captionTracks.find((t) => t.language_code === "ja");
  const track = jaTrack || captionTracks[0];

  if (!track.base_url) {
    throw new Error("Caption track has no base_url");
  }

  // XMLフォーマットでフェッチ（json3より信頼性が高い場合がある）
  const response = await fetch(track.base_url);
  const xml = await response.text();

  if (!xml || xml.length === 0) {
    throw new Error("Empty response from caption track URL");
  }

  // XMLをパース（シンプルな正規表現パース）
  const segments: TranscriptSegment[] = [];
  const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let match;

  while ((match = textRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]) || 0;
    const duration = parseFloat(match[2]) || 0;
    // HTMLエンティティをデコード
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();

    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

// YouTubeの字幕を取得（ハイブリッドアプローチ）
export async function getTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  // 1. Innertube getTranscript()を試す
  try {
    console.log(`[Transcript] Trying Innertube getTranscript for ${videoId}...`);
    const segments = await getTranscriptFromInnertube(videoId);
    if (segments.length > 0) {
      console.log(`[Transcript] Success via Innertube: ${segments.length} segments`);
      return segments;
    }
  } catch (error) {
    console.log(`[Transcript] Innertube getTranscript failed:`, error instanceof Error ? error.message : error);
  }

  // 2. caption_tracksのbase_urlから直接取得を試す
  try {
    console.log(`[Transcript] Trying caption_tracks fallback for ${videoId}...`);
    const segments = await getTranscriptFromCaptionTracks(videoId);
    if (segments.length > 0) {
      console.log(`[Transcript] Success via caption_tracks: ${segments.length} segments`);
      return segments;
    }
  } catch (error) {
    console.log(`[Transcript] caption_tracks fallback failed:`, error instanceof Error ? error.message : error);
  }

  console.error(`[Transcript] All methods failed for ${videoId}`);
  return [];
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
