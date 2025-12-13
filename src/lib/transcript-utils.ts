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
  // すでに正規化されている場合（DBから読み込んだデータ）
  // TranscriptSegment型は {text, start, duration} で start は秒単位
  if ('start' in segment && typeof segment.start === 'number' &&
      'duration' in segment && !('startMs' in segment) && !('startOffsetMs' in segment)) {
    // すでに秒単位に正規化済み - そのまま返す
    return segment.start;
  }

  // 正規化されていない生データの場合、様々なプロパティ名を試す
  const rawSegment = segment as RawTranscriptSnippet;

  // プロパティ名に "Ms" が含まれる場合はミリ秒と判定
  const startOffsetMs = rawSegment.startOffsetMs ?? rawSegment.start_offset_ms;
  if (startOffsetMs !== undefined) {
    return parseTimeValue(startOffsetMs) / 1000;
  }

  const startMs = rawSegment.start_ms ?? rawSegment.startMs;
  if (startMs !== undefined) {
    return parseTimeValue(startMs) / 1000;
  }

  const startTimeMs = rawSegment.startTimeMs ?? rawSegment.start_time_ms;
  if (startTimeMs !== undefined) {
    return parseTimeValue(startTimeMs) / 1000;
  }

  // "Ms" がつかないプロパティは秒単位の可能性が高い
  const start = rawSegment.start;
  if (start !== undefined) {
    const value = parseTimeValue(start);
    // 非常に大きい値（10000秒 = 2.7時間以上）ならミリ秒の可能性
    if (value > TIME_UNIT_THRESHOLD_MS) {
      return value / 1000;
    }
    return value;
  }

  return 0;
}

/**
 * セグメントから表示時間を計算（複数のプロパティ名に対応）
 * @param segment トランスクリプトセグメント
 * @returns 表示時間（秒単位）
 */
export function getSegmentDuration(segment: TranscriptSegment | RawTranscriptSnippet): number {
  // すでに正規化されている場合（DBから読み込んだデータ）
  if ('duration' in segment && typeof segment.duration === 'number' &&
      'start' in segment && !('dur' in segment) && !('endMs' in segment)) {
    // すでに秒単位に正規化済み - そのまま返す
    return segment.duration;
  }

  // 正規化されていない生データの場合
  const rawSegment = segment as RawTranscriptSnippet;
  const startTime = getSegmentStartTime(segment);

  // プロパティ名に "Ms" が含まれる終了時刻プロパティをチェック
  const endOffsetMs = rawSegment.endOffsetMs ?? rawSegment.end_offset_ms;
  if (endOffsetMs !== undefined) {
    const endTime = parseTimeValue(endOffsetMs) / 1000;
    return Math.max(0, endTime - startTime);
  }

  const endMs = rawSegment.end_ms ?? rawSegment.endMs;
  if (endMs !== undefined) {
    const endTime = parseTimeValue(endMs) / 1000;
    return Math.max(0, endTime - startTime);
  }

  const endTimeMs = rawSegment.endTimeMs ?? rawSegment.end_time_ms;
  if (endTimeMs !== undefined) {
    const endTime = parseTimeValue(endTimeMs) / 1000;
    return Math.max(0, endTime - startTime);
  }

  // "Ms" がつかないendプロパティ
  const end = rawSegment.end;
  if (end !== undefined) {
    const value = parseTimeValue(end);
    const endTime = value > TIME_UNIT_THRESHOLD_MS ? value / 1000 : value;
    return Math.max(0, endTime - startTime);
  }

  // durationプロパティから直接取得
  const durValue = rawSegment.dur ?? rawSegment.duration;
  if (durValue !== undefined) {
    const dur = parseTimeValue(durValue);
    // 非常に大きい値ならミリ秒の可能性
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

  let startMs = 0;
  let endMs = 0;

  // プロパティ名に基づいて単位を判定（"Ms" がつくプロパティはミリ秒）

  // 開始時刻の取得（プロパティ名ベースで単位判定）
  if (data.startOffsetMs !== undefined || data.start_offset_ms !== undefined) {
    startMs = parseTimeValue(data.startOffsetMs ?? data.start_offset_ms);
  } else if (data.start_ms !== undefined || data.startMs !== undefined) {
    startMs = parseTimeValue(data.start_ms ?? data.startMs);
  } else if (data.start_time_ms !== undefined || data.startTimeMs !== undefined) {
    startMs = parseTimeValue(data.start_time_ms ?? data.startTimeMs);
  } else if (data.start !== undefined) {
    // "Ms" がつかない場合は秒単位の可能性
    const value = parseTimeValue(data.start);
    // 非常に大きい値（10000秒 = 2.7時間以上）の場合のみミリ秒と判定
    startMs = value > TIME_UNIT_THRESHOLD_MS ? value : value * 1000;
  }

  // 終了時刻の取得（プロパティ名ベースで単位判定）
  if (data.endOffsetMs !== undefined || data.end_offset_ms !== undefined) {
    endMs = parseTimeValue(data.endOffsetMs ?? data.end_offset_ms);
  } else if (data.end_ms !== undefined || data.endMs !== undefined) {
    endMs = parseTimeValue(data.end_ms ?? data.endMs);
  } else if (data.end_time_ms !== undefined || data.endTimeMs !== undefined) {
    endMs = parseTimeValue(data.end_time_ms ?? data.endTimeMs);
  } else if (data.end !== undefined) {
    const value = parseTimeValue(data.end);
    endMs = value > TIME_UNIT_THRESHOLD_MS ? value : value * 1000;
  }

  // endが取得できない場合、durationから計算
  if (endMs === 0 || endMs <= startMs) {
    const durationValue = data.duration ?? data.dur;
    if (durationValue !== undefined) {
      const value = parseTimeValue(durationValue);
      // durationも "Ms" がつかない場合は秒単位の可能性
      const durationMs = value > TIME_UNIT_THRESHOLD_MS ? value : value * 1000;
      endMs = startMs + durationMs;
    }
  }

  // デバッグ: 最初のセグメントのみログ出力（開発環境のみ）
  if (index === 0 && process.env.NODE_ENV === 'development') {
    console.log(`[Transcript Debug] First segment structure:`, JSON.stringify(data, null, 2));
    console.log(`[Transcript Debug] Parsed timestamps: start=${startMs}ms, end=${endMs}ms`);

    if (startMs === 0 && endMs === 0) {
      console.error(`[Transcript Error] ❌ No valid timestamp found in first segment`);
      console.error(`[Transcript Error] Available keys:`, Object.keys(data));
    } else {
      console.log(`[Transcript Success] ✓ Timestamps parsed successfully`);
    }
  }

  // データ品質チェック（負の値を除外）
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs < 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[Transcript Warning] Invalid timestamp at segment ${index}: start=${startMs}ms, end=${endMs}ms`
      );
    }
    return null;
  }

  const text = String(data.text || rawSegment.text || "");

  return {
    text: text,
    start: startMs / 1000,
    duration: Math.max(0, (endMs - startMs) / 1000),
  };
}
