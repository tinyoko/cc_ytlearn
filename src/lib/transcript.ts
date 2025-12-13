import { Innertube } from "youtubei.js";

// トランスクリプトセグメントの型定義
export interface TranscriptSegment {
  text: string;
  start: number; // 開始時間（秒）
  duration: number; // 表示時間（秒）
}

// youtubei.jsのトランスクリプトセグメントの型定義
interface YoutubeTranscriptSnippet {
  text?: string;
  // タイムスタンプのプロパティ（複数の命名規則に対応）
  start_ms?: number | string;
  startMs?: number | string;
  start_time_ms?: number | string;
  startTimeMs?: number | string;
  end_ms?: number | string;
  endMs?: number | string;
  end_time_ms?: number | string;
  endTimeMs?: number | string;
}

interface YoutubeTranscriptSegment {
  snippet?: YoutubeTranscriptSnippet;
}

// Innertubeインスタンスをキャッシュ
let innertubeInstance: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create();
  }
  return innertubeInstance;
}

// 数値を安全にパースする関数
function parseTimeValue(value: number | string | undefined | null): number {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (process.env.NODE_ENV === 'development' && segments.length > 0) {
    console.error(`[Transcript Debug] First segment full structure:`, JSON.stringify(segments[0], null, 2));
  }

  const result = (segments as YoutubeTranscriptSegment[])
    .filter((segment): segment is YoutubeTranscriptSegment => {
      return (
        segment !== null &&
        typeof segment === "object" &&
        "snippet" in segment &&
        segment.snippet !== null &&
        typeof segment.snippet === "object"
      );
    })
    .map((segment, index) => {
      const snippet = segment.snippet!;

      // すべての可能なプロパティ名を試す
      const startValue = snippet.start_ms ?? snippet.startMs ?? snippet.start_time_ms ?? snippet.startTimeMs;
      const endValue = snippet.end_ms ?? snippet.endMs ?? snippet.end_time_ms ?? snippet.endTimeMs;

      const startMs = parseTimeValue(startValue);
      const endMs = parseTimeValue(endValue);

      // 詳細な警告: タイムスタンプが取得できていない場合
      if (index === 0) {
        if (startMs === 0 && endMs === 0) {
          console.error(`[Transcript Error] No timestamp data found in first segment!`);
          console.error(`[Transcript Error] Available snippet keys:`, Object.keys(snippet));
          console.error(`[Transcript Error] Snippet values:`, JSON.stringify(snippet, null, 2));
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Transcript Success] First segment: start=${startMs}ms, end=${endMs}ms, text="${snippet.text?.substring(0, 30)}..."`);
          }
        }
      }

      // データ品質チェック
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        console.error(`[Transcript Warning] Invalid timestamp at segment ${index}: start=${startValue}, end=${endValue}`);
      }

      return {
        text: snippet.text || "",
        start: startMs / 1000,
        duration: Math.max(0, (endMs - startMs) / 1000),
      };
    });

  // 最終結果の検証
  const validSegments = result.filter(seg => seg.start > 0 || seg.duration > 0);
  if (validSegments.length === 0 && result.length > 0) {
    console.error(`[Transcript Error] All ${result.length} segments have zero timestamps!`);
  } else {
    console.log(`[Transcript] Processed ${result.length} segments, ${validSegments.length} with valid timestamps`);
  }

  return result;
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

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Transcript] Using caption track: ${track.name?.text || 'Unknown'} (${track.language_code || 'unknown'})`);
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
    const start = parseTimeValue(match[1]);
    const duration = parseTimeValue(match[2]);

    // データ品質チェック
    if (!Number.isFinite(start) || !Number.isFinite(duration)) {
      console.error(`[Transcript Warning] Invalid XML timestamp: start="${match[1]}", dur="${match[2]}"`);
      continue;
    }

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

  if (segments.length > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[Transcript] XML parsed: first segment at ${segments[0].start}s`);
  }

  return segments;
}

// YouTubeの字幕を取得（ハイブリッドアプローチ）
export async function getTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  console.log(`[Transcript] Starting transcript fetch for video: ${videoId}`);

  // 1. Innertube getTranscript()を試す
  try {
    console.log(`[Transcript] Trying Innertube getTranscript...`);
    const segments = await getTranscriptFromInnertube(videoId);
    if (segments.length > 0) {
      console.log(`[Transcript] ✓ Success via Innertube: ${segments.length} segments`);
      return segments;
    }
  } catch (error) {
    console.error(`[Transcript] ✗ Innertube getTranscript failed:`, error instanceof Error ? error.message : error);
  }

  // 2. caption_tracksのbase_urlから直接取得を試す
  try {
    console.log(`[Transcript] Trying caption_tracks fallback...`);
    const segments = await getTranscriptFromCaptionTracks(videoId);
    if (segments.length > 0) {
      console.log(`[Transcript] ✓ Success via caption_tracks: ${segments.length} segments`);
      return segments;
    }
  } catch (error) {
    console.error(`[Transcript] ✗ caption_tracks fallback failed:`, error instanceof Error ? error.message : error);
  }

  console.error(`[Transcript] ✗✗ All methods failed for ${videoId}`);
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
