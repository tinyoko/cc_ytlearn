/**
 * トランスクリプト（字幕）の型定義
 */

// 正規化されたトランスクリプトセグメント（アプリケーション内で使用）
export interface TranscriptSegment {
  text: string;
  start: number; // 開始時間（秒）
  duration: number; // 表示時間（秒）
}

// youtubei.jsから返される生のトランスクリプトデータの型定義
// 複数の命名規則に対応するため、すべての可能なプロパティ名を定義
export interface RawTranscriptSnippet {
  text?: string;

  // タイムスタンプのプロパティ（ミリ秒または秒単位）
  // 開始時刻
  start_ms?: number | string;
  startMs?: number | string;
  start_time_ms?: number | string;
  startTimeMs?: number | string;
  startOffsetMs?: number | string;
  start_offset_ms?: number | string;
  start?: number | string;

  // 終了時刻
  end_ms?: number | string;
  endMs?: number | string;
  end_time_ms?: number | string;
  endTimeMs?: number | string;
  endOffsetMs?: number | string;
  end_offset_ms?: number | string;
  end?: number | string;

  // 表示時間
  duration?: number | string;
  dur?: number | string;

  // その他すべてのプロパティを受け入れる
  [key: string]: unknown;
}

// youtubei.jsのセグメント構造
export interface RawTranscriptSegment {
  snippet?: RawTranscriptSnippet;

  // snippetがない場合、直接プロパティを持つ可能性があるため、
  // RawTranscriptSnippetと同じプロパティを定義
  text?: string;
  start_ms?: number | string;
  startMs?: number | string;
  startOffsetMs?: number | string;
  start_offset_ms?: number | string;
  start_time_ms?: number | string;
  startTimeMs?: number | string;
  end_ms?: number | string;
  endMs?: number | string;
  endOffsetMs?: number | string;
  end_offset_ms?: number | string;
  end_time_ms?: number | string;
  endTimeMs?: number | string;
  start?: number | string;
  end?: number | string;
  duration?: number | string;
  dur?: number | string;

  [key: string]: unknown;
}
