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
  startOffsetMs?: number | string;
  start_offset_ms?: number | string;
  end_ms?: number | string;
  endMs?: number | string;
  end_time_ms?: number | string;
  endTimeMs?: number | string;
  endOffsetMs?: number | string;
  end_offset_ms?: number | string;
  // 秒単位の可能性もあるため追加
  start?: number | string;
  end?: number | string;
  duration?: number | string;
  dur?: number | string;
  // その他すべてのプロパティを受け入れる
  [key: string]: unknown;
}

interface YoutubeTranscriptSegment {
  snippet?: YoutubeTranscriptSnippet;
  // snippetがない場合、直接プロパティを持つ可能性
  start_ms?: number | string;
  startMs?: number | string;
  startOffsetMs?: number | string;
  start_offset_ms?: number | string;
  end_ms?: number | string;
  endMs?: number | string;
  endOffsetMs?: number | string;
  end_offset_ms?: number | string;
  start?: number | string;
  end?: number | string;
  duration?: number | string;
  dur?: number | string;
  text?: string;
  [key: string]: unknown;
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

  // デバッグ: 最初のセグメントの構造を確認（常に表示）
  if (segments.length > 0) {
    console.error(`[Transcript Debug] First segment full structure:`, JSON.stringify(segments[0], null, 2));
  }

  const result = (segments as YoutubeTranscriptSegment[])
    .map((segment, index) => {
      // snippetがあるかチェック
      const data = segment.snippet || segment;

      if (!data || typeof data !== "object") {
        console.error(`[Transcript Error] Segment ${index} is not an object:`, data);
        return null;
      }

      // すべての可能なプロパティ名を試す（優先順位順）
      const startValue =
        data.startOffsetMs ??
        data.start_offset_ms ??
        data.start_ms ??
        data.startMs ??
        data.start_time_ms ??
        data.startTimeMs ??
        data.start;

      const endValue =
        data.endOffsetMs ??
        data.end_offset_ms ??
        data.end_ms ??
        data.endMs ??
        data.end_time_ms ??
        data.endTimeMs ??
        data.end;

      const durationValue = data.duration ?? data.dur;

      let startMs = parseTimeValue(startValue);
      let endMs = parseTimeValue(endValue);

      // startとendが秒単位の可能性をチェック（値が小さい場合）
      if (startMs > 0 && startMs < 100000 && startValue !== undefined) {
        const asSeconds = parseFloat(String(startValue));
        if (asSeconds < 10000) {
          // おそらく秒単位なのでミリ秒に変換
          startMs = asSeconds * 1000;
        }
      }

      if (endMs > 0 && endMs < 100000 && endValue !== undefined) {
        const asSeconds = parseFloat(String(endValue));
        if (asSeconds < 10000) {
          endMs = asSeconds * 1000;
        }
      }

      // durationから終了時刻を計算する必要がある場合
      if (durationValue !== undefined && (endMs === 0 || endValue === undefined)) {
        const durationMs = parseTimeValue(durationValue);
        // durationも秒単位の可能性をチェック
        if (durationMs > 0 && durationMs < 100000) {
          const asSeconds = parseFloat(String(durationValue));
          if (asSeconds < 10000) {
            endMs = startMs + (asSeconds * 1000);
          } else {
            endMs = startMs + durationMs;
          }
        }
      }

      // 詳細なデバッグ: 最初のセグメント
      if (index === 0) {
        console.error(`[Transcript Debug] First segment parsed values:`);
        console.error(`  - startValue (raw):`, startValue);
        console.error(`  - endValue (raw):`, endValue);
        console.error(`  - durationValue (raw):`, durationValue);
        console.error(`  - startMs (parsed):`, startMs);
        console.error(`  - endMs (parsed):`, endMs);
        console.error(`  - Available keys:`, Object.keys(data));

        if (startMs === 0 && endMs === 0) {
          console.error(`[Transcript Error] ❌ No valid timestamp found!`);
          console.error(`[Transcript Error] All properties:`, JSON.stringify(data, null, 2));
        } else {
          console.error(`[Transcript Success] ✓ Timestamps found: start=${startMs}ms, end=${endMs}ms`);
        }
      }

      // データ品質チェック
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        console.error(`[Transcript Warning] Invalid timestamp at segment ${index}: start=${startValue}, end=${endValue}`);
      }

      const text = (data.text || segment.text || "") as string;

      return {
        text: text,
        start: startMs / 1000,
        duration: Math.max(0, (endMs - startMs) / 1000),
      };
    })
    .filter((seg): seg is TranscriptSegment => seg !== null);

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
