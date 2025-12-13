/**
 * トランスクリプト処理の共通ユーティリティ関数
 */

import type { TranscriptSegment, RawTranscriptSnippet, RawTranscriptSegment } from "@/types/transcript";

/**
 * タイムスタンプの判定閾値（定数化）
 */
// 10秒未満の値は秒単位、10秒以上はミリ秒単位と判定
export const TIME_UNIT_THRESHOLD_MS = 10000;
// 100秒未満の値は秒単位の可能性がある
export const SECONDS_CANDIDATE_THRESHOLD = 100000;

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
 * @param segment トランスクリプトセグメント
 * @returns 開始時刻（秒単位）
 */
export function getSegmentStartTime(segment: TranscriptSegment | RawTranscriptSnippet): number {
  // すでに正規化されている場合
  if ('start' in segment && segment.start !== undefined) {
    const start = parseTimeValue(segment.start);
    // ミリ秒単位の場合は秒に変換
    if (start > TIME_UNIT_THRESHOLD_MS) {
      return start / 1000;
    }
    return start;
  }

  // 正規化されていない場合、様々なプロパティ名を試す（優先順位順）
  const rawSegment = segment as RawTranscriptSnippet;
  const startValue =
    rawSegment.startOffsetMs ??
    rawSegment.start_offset_ms ??
    rawSegment.start_ms ??
    rawSegment.startMs ??
    rawSegment.startTimeMs ??
    rawSegment.start_time_ms ??
    rawSegment.start;

  if (startValue === undefined) {
    return 0;
  }

  const startMs = parseTimeValue(startValue);

  // ミリ秒単位の場合は秒に変換（値が大きい場合）
  if (startMs > TIME_UNIT_THRESHOLD_MS) {
    return startMs / 1000;
  }

  // すでに秒単位の場合はそのまま返す
  return startMs;
}

/**
 * セグメントから表示時間を計算（複数のプロパティ名に対応）
 * @param segment トランスクリプトセグメント
 * @returns 表示時間（秒単位）
 */
export function getSegmentDuration(segment: TranscriptSegment | RawTranscriptSnippet): number {
  // すでに正規化されている場合
  if ('duration' in segment && segment.duration !== undefined) {
    const duration = parseTimeValue(segment.duration);
    // ミリ秒単位の場合は秒に変換
    if (duration > TIME_UNIT_THRESHOLD_MS) {
      return duration / 1000;
    }
    return duration;
  }

  // 終了時刻から計算
  const startTime = getSegmentStartTime(segment);
  const rawSegment = segment as RawTranscriptSnippet;

  const endValue =
    rawSegment.endOffsetMs ??
    rawSegment.end_offset_ms ??
    rawSegment.end_ms ??
    rawSegment.endMs ??
    rawSegment.endTimeMs ??
    rawSegment.end_time_ms ??
    rawSegment.end;

  if (endValue !== undefined) {
    const endMs = parseTimeValue(endValue);
    const endTime = endMs > TIME_UNIT_THRESHOLD_MS ? endMs / 1000 : endMs;
    return Math.max(0, endTime - startTime);
  }

  // durationプロパティから取得
  const durValue = rawSegment.dur ?? rawSegment.duration;
  if (durValue !== undefined) {
    const dur = parseTimeValue(durValue);
    return dur > TIME_UNIT_THRESHOLD_MS ? dur / 1000 : dur;
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
  // snippetがあるかチェック
  const data = rawSegment.snippet || rawSegment;

  if (!data || typeof data !== "object") {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Transcript] Segment ${index} is not an object:`, data);
    }
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
  if (startMs > 0 && startMs < SECONDS_CANDIDATE_THRESHOLD && startValue !== undefined) {
    const asSeconds = parseFloat(String(startValue));
    if (asSeconds < TIME_UNIT_THRESHOLD_MS) {
      // おそらく秒単位なのでミリ秒に変換
      startMs = asSeconds * 1000;
    }
  }

  if (endMs > 0 && endMs < SECONDS_CANDIDATE_THRESHOLD && endValue !== undefined) {
    const asSeconds = parseFloat(String(endValue));
    if (asSeconds < TIME_UNIT_THRESHOLD_MS) {
      endMs = asSeconds * 1000;
    }
  }

  // durationから終了時刻を計算する必要がある場合
  if (durationValue !== undefined && (endMs === 0 || endValue === undefined)) {
    const durationMs = parseTimeValue(durationValue);
    // durationも秒単位の可能性をチェック
    if (durationMs > 0 && durationMs < SECONDS_CANDIDATE_THRESHOLD) {
      const asSeconds = parseFloat(String(durationValue));
      if (asSeconds < TIME_UNIT_THRESHOLD_MS) {
        endMs = startMs + asSeconds * 1000;
      } else {
        endMs = startMs + durationMs;
      }
    } else {
      endMs = startMs + durationMs;
    }
  }

  // デバッグ: 最初のセグメントのみログ出力（開発環境のみ）
  if (index === 0 && process.env.NODE_ENV === 'development') {
    if (startMs === 0 && endMs === 0) {
      console.error(`[Transcript Error] ❌ No valid timestamp found in first segment`);
      console.error(`[Transcript Error] Available keys:`, Object.keys(data));
    }
  }

  // データ品質チェック
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[Transcript Warning] Invalid timestamp at segment ${index}: start=${startValue}, end=${endValue}`
      );
    }
  }

  const text = String(data.text || rawSegment.text || "");

  return {
    text: text,
    start: startMs / 1000,
    duration: Math.max(0, (endMs - startMs) / 1000),
  };
}
