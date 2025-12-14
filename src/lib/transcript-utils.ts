/**
 * トランスクリプト処理の共通ユーティリティ関数
 */

import type { TranscriptSegment, RawTranscriptSnippet, RawTranscriptSegment } from "@/types/transcript";

/**
 * 数値を安全にパースする関数
 * @param value パースする値（数値、文字列、undefined、null）
 * @returns パースされた数値（無効な場合は0）
 */
export function parseTimeValue(value: number | string | undefined | null): number {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * セグメントから開始時刻を抽出（複数のプロパティ名に対応）
 * 以前の複雑な単位推測ロジックを廃止し、プロパティ名に基づく厳格な判定を行う
 * - Ms/msが含まれるプロパティ: ミリ秒として扱い / 1000
 * - それ以外(startなど): 秒として扱う
 * 
 * @param segment トランスクリプトセグメント
 * @returns 開始時刻（秒単位）
 */
export function getSegmentStartTime(segment: TranscriptSegment | RawTranscriptSnippet): number {
  // 1. 正規化済みデータのチェック (型ガード)
  // 1. 正規化済みデータのチェック (型ガード)
  if ('start' in segment && typeof segment.start === 'number') {
    return segment.start;
  }

  const raw = segment as RawTranscriptSnippet;

  // 2. ミリ秒系プロパティの優先チェック
  // 順序: startOffsetMs -> startMs -> startTimeMs -> start_ms 等
  const msCandidates = [
    raw.startOffsetMs,
    raw.start_offset_ms,
    raw.startMs,
    raw.start_ms,
    raw.startTimeMs,
    raw.start_time_ms
  ];

  for (const candidate of msCandidates) {
    if (candidate !== undefined) {
      return parseTimeValue(candidate) / 1000;
    }
  }

  // 3. 秒単位プロパティのチェック
  if (raw.start !== undefined) {
    return parseTimeValue(raw.start);
  }

  return 0;
}

/**
 * セグメントから表示時間を計算
 * @param segment トランスクリプトセグメント
 * @returns 表示時間（秒単位）
 */
export function getSegmentDuration(segment: TranscriptSegment | RawTranscriptSnippet): number {
  // 1. 正規化済みデータのチェック
  if ('duration' in segment && typeof segment.duration === 'number' && !('dur' in segment)) {
    return segment.duration;
  }

  const raw = segment as RawTranscriptSnippet;

  // 終了時刻がある場合はそれを使用 (End - Start)
  const startTime = getSegmentStartTime(segment);
  let endTime = 0;
  let hasEndTime = false;

  // ミリ秒系終了時刻チェック
  const endMsCandidates = [
    raw.endOffsetMs,
    raw.end_offset_ms,
    raw.endMs,
    raw.end_ms,
    raw.endTimeMs,
    raw.end_time_ms
  ];

  for (const candidate of endMsCandidates) {
    if (candidate !== undefined) {
      endTime = parseTimeValue(candidate) / 1000;
      hasEndTime = true;
      break;
    }
  }

  if (!hasEndTime && raw.end !== undefined) {
    endTime = parseTimeValue(raw.end);
    hasEndTime = true;
  }

  if (hasEndTime) {
    return Math.max(0, endTime - startTime);
  }

  // もし終了時刻がなければ duration プロパティを探す
  const durValue = raw.dur ?? raw.duration;
  if (durValue !== undefined) {
    return parseTimeValue(durValue); // duration は秒とみなす（Msプロパティがないため）
  }

  return 0;
}

/**
 * タイムスタンプをフォーマット（秒 -> MM:SS または HH:MM:SS）
 * @param seconds 秒数
 * @returns フォーマットされたタイムスタンプ文字列
 */
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

/**
 * トランスクリプトを全文テキストに変換
 * @param segments トランスクリプトセグメントの配列
 * @returns 連結されたテキスト
 */
export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}

/**
 * 生のセグメントデータを正規化されたTranscriptSegmentに変換
 * @param rawSegment 生のセグメントデータ
 * @param index セグメントのインデックス（デバッグ用）
 * @returns 正規化されたセグメント、または無効な場合はnull
 */
export function normalizeSegment(
  rawSegment: RawTranscriptSegment,
  index: number
): TranscriptSegment | null {
  if (!rawSegment || typeof rawSegment !== "object") {
    return null;
  }

  // FORCE SIMPLE EXTRACTION (Reference Project Style)
  // item.start_ms is on the parent. item.snippet.text is in snippet.

  // FORCE PLAIN OBJECT: Ensure we are working with a plain JSON object
  // distinct from potentially complex class instances from the library.
  const raw = JSON.parse(JSON.stringify(rawSegment));

  // Try multiple property names for start time (Youtubei.js versions vary)
  let startMs = parseInt(raw.start_ms);
  if (isNaN(startMs)) startMs = parseInt(raw.startTimeMs);
  if (isNaN(startMs)) startMs = parseInt(raw.offsetMs);
  if (isNaN(startMs)) startMs = parseInt(raw.startOffsetMs);
  if (isNaN(startMs)) startMs = parseInt(raw.start_time_ms);

  const endMs = parseInt(raw.end_ms);
  const text = raw.snippet?.text || raw.text || "";

  // Duration calculation
  let duration = 0;
  if (!isNaN(startMs) && !isNaN(endMs)) {
    duration = (endMs - startMs) / 1000;
  } else if (raw.duration) {
    duration = parseFloat(raw.duration);
  }

  // Fallback for start if start_ms is missing (should not happen based on debug data)
  let start = 0;
  if (!isNaN(startMs)) {
    start = startMs / 1000;
  } else if (raw.start) {
    start = parseFloat(raw.start);
  }

  // Validate
  if (!text && duration <= 0) return null;

  return {
    text: String(text),
    start: start,
    duration: Math.max(0, duration)
  };
}
