"use client";

import { useRef, useEffect } from "react";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
  // DB内のデータが正規化されていない場合に備えて、様々なプロパティ名に対応
  startOffsetMs?: number;
  start_offset_ms?: number;
  start_ms?: number;
  startMs?: number;
  startTimeMs?: number;
  start_time_ms?: number;
  endOffsetMs?: number;
  end_offset_ms?: number;
  end_ms?: number;
  endMs?: number;
  endTimeMs?: number;
  end_time_ms?: number;
  dur?: number;
  [key: string]: unknown;
}

interface TranscriptPanelProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
}

// 安全に時間値をパースする関数
function parseTimeValue(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// セグメントから開始時刻を抽出（複数のプロパティ名に対応）
function getSegmentStartTime(segment: TranscriptSegment): number {
  // まず正規化された `start` プロパティをチェック
  if (segment.start !== undefined && segment.start > 0) {
    return segment.start;
  }

  // 正規化されていない場合、様々なプロパティ名を試す
  const startValue =
    segment.startOffsetMs ??
    segment.start_offset_ms ??
    segment.start_ms ??
    segment.startMs ??
    segment.startTimeMs ??
    segment.start_time_ms ??
    segment.start;

  if (startValue === undefined) return 0;

  let startMs = parseTimeValue(startValue);

  // ミリ秒単位の場合は秒に変換（値が大きい場合）
  if (startMs > 10000) {
    return startMs / 1000;
  }

  // すでに秒単位の場合はそのまま返す
  return startMs;
}

// セグメントから表示時間を計算（複数のプロパティ名に対応）
function getSegmentDuration(segment: TranscriptSegment): number {
  // まず正規化された `duration` プロパティをチェック
  if (segment.duration !== undefined && segment.duration > 0) {
    return segment.duration;
  }

  // 終了時刻から計算
  const startTime = getSegmentStartTime(segment);

  const endValue =
    segment.endOffsetMs ??
    segment.end_offset_ms ??
    segment.end_ms ??
    segment.endMs ??
    segment.endTimeMs ??
    segment.end_time_ms;

  if (endValue !== undefined) {
    let endMs = parseTimeValue(endValue);
    let endTime = endMs > 10000 ? endMs / 1000 : endMs;
    return Math.max(0, endTime - startTime);
  }

  // durationプロパティから取得
  const durValue = segment.dur ?? segment.duration;
  if (durValue !== undefined) {
    let dur = parseTimeValue(durValue);
    return dur > 10000 ? dur / 1000 : dur;
  }

  return 0;
}

// 秒数を MM:SS 形式に変換
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptPanel({
  transcript,
  currentTime,
  onSeek,
}: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // デバッグ: 最初のセグメントの構造を確認
  useEffect(() => {
    if (transcript.length > 0) {
      const first = transcript[0];
      console.log('[TranscriptPanel] First segment structure:', JSON.stringify(first, null, 2));
      console.log('[TranscriptPanel] Parsed start time:', getSegmentStartTime(first));
      console.log('[TranscriptPanel] Parsed duration:', getSegmentDuration(first));
    }
  }, [transcript]);

  // 現在再生中のセグメントを特定
  const currentSegmentIndex = transcript.findIndex((segment) => {
    const startTime = getSegmentStartTime(segment);
    const duration = getSegmentDuration(segment);
    const endTime = startTime + duration;
    return currentTime >= startTime && currentTime < endTime;
  });

  // 現在のセグメントが変わったら自動スクロール
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;

      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // アクティブな要素がコンテナの表示領域外にある場合のみスクロール
      const isAbove = activeRect.top < containerRect.top;
      const isBelow = activeRect.bottom > containerRect.bottom;

      if (isAbove || isBelow) {
        active.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSegmentIndex]);

  if (transcript.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400">
        <p className="text-sm">字幕データがありません</p>
        <p className="text-xs mt-2">
          この動画には字幕が含まれていないか、
          <br />
          字幕の取得に失敗しました
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="divide-y divide-slate-700/50">
        {transcript.map((segment, index) => {
          const isActive = index === currentSegmentIndex;
          const startTime = getSegmentStartTime(segment);

          return (
            <button
              key={`${startTime}-${index}`}
              ref={isActive ? activeRef : null}
              onClick={() => onSeek(startTime)}
              className={`w-full px-4 py-2 text-left transition-colors hover:bg-slate-700/50 ${
                isActive ? "bg-blue-500/20" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex-shrink-0 text-xs font-mono mt-0.5 ${
                    isActive ? "text-blue-400" : "text-slate-500"
                  }`}
                >
                  {formatTime(startTime)}
                </span>
                <p
                  className={`text-sm leading-relaxed ${
                    isActive ? "text-slate-100" : "text-slate-300"
                  }`}
                >
                  {segment.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
