import { Innertube } from "youtubei.js";
import type { TranscriptSegment, RawTranscriptSegment } from "@/types/transcript";
import { parseTimeValue, normalizeSegment, transcriptToText, formatTimestamp } from "@/lib/transcript-utils";

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

  // デバッグ: 最初のセグメントの構造を確認（開発環境のみ）
  if (segments.length > 0 && process.env.NODE_ENV === 'development') {
    console.log(
      `[Transcript Debug] First segment full structure:`,
      JSON.stringify(segments[0], null, 2)
    );
  }

  const result = (segments as RawTranscriptSegment[])
    .map((segment, index) => normalizeSegment(segment, index))
    .filter((seg): seg is TranscriptSegment => seg !== null);

  // CRITICAL FIX: 0秒開始の字幕も有効なデータとして扱う
  // 以前は `seg.start > 0` でフィルタリングしていたが、これは0秒開始の字幕を除外してしまう
  // 修正: start と duration が有限数で非負、かつ duration が0より大きい場合のみ有効と判定
  const validSegments = result.filter(
    (seg) =>
      Number.isFinite(seg.start) &&
      seg.start >= 0 &&
      Number.isFinite(seg.duration) &&
      seg.duration > 0
  );

  if (validSegments.length === 0 && result.length > 0) {
    console.error(
      `[Transcript Error] All ${result.length} segments have invalid timestamps!`
    );
  } else if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Transcript] Processed ${result.length} segments, ${validSegments.length} valid`
    );
  }

  return validSegments;
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
    console.log(
      `[Transcript] Using caption track: ${track.name?.text || 'Unknown'} (${track.language_code || 'unknown'})`
    );
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

    // データ品質チェック（負の値を除外）
    if (!Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[Transcript Warning] Invalid XML timestamp: start="${match[1]}", dur="${match[2]}"`
        );
      }
      continue;
    }

    // HTMLエンティティをデコード（基本的なエンティティのみ、セキュリティ考慮）
    // 注: Reactは自動的にエスケープするため、ここでデコードしても安全
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'")
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
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Transcript] Starting transcript fetch for video: ${videoId}`);
  }

  // 1. Innertube getTranscript()を試す
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Transcript] Trying Innertube getTranscript...`);
    }
    const segments = await getTranscriptFromInnertube(videoId);
    if (segments.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Transcript] ✓ Success via Innertube: ${segments.length} segments`);
      }
      return segments;
    }
  } catch (error) {
    console.error(
      `[Transcript] ✗ Innertube getTranscript failed:`,
      error instanceof Error ? error.message : error
    );
  }

  // 2. caption_tracksのbase_urlから直接取得を試す
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Transcript] Trying caption_tracks fallback...`);
    }
    const segments = await getTranscriptFromCaptionTracks(videoId);
    if (segments.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Transcript] ✓ Success via caption_tracks: ${segments.length} segments`);
      }
      return segments;
    }
  } catch (error) {
    console.error(
      `[Transcript] ✗ caption_tracks fallback failed:`,
      error instanceof Error ? error.message : error
    );
  }

  console.error(`[Transcript] ✗✗ All methods failed for ${videoId}`);
  return [];
}

// Re-export utility functions for backward compatibility
export { transcriptToText, formatTimestamp };
