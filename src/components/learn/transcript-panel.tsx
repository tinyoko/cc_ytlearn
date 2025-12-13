"use client";

import { useRef, useEffect } from "react";
import type { TranscriptSegment } from "@/types/transcript";
import { getSegmentStartTime, getSegmentDuration, formatTimestamp } from "@/lib/transcript-utils";

interface TranscriptPanelProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export function TranscriptPanel({
  transcript,
  currentTime,
  onSeek,
}: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // 現在再生中のセグメントを特定（二分探索で最適化）
  const currentSegmentIndex = (() => {
    if (transcript.length === 0) return -1;

    // 二分探索でcurrentTimeに最も近いセグメントを探す
    let left = 0;
    let right = transcript.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const startTime = getSegmentStartTime(transcript[mid]);
      const duration = getSegmentDuration(transcript[mid]);
      const endTime = startTime + duration;

      if (currentTime >= startTime && currentTime < endTime) {
        return mid; // 完全一致
      } else if (currentTime < startTime) {
        right = mid - 1;
      } else {
        result = mid; // 候補として保存
        left = mid + 1;
      }
    }

    return result;
  })();

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

  // 空状態UI（字幕がない場合）
  if (transcript.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-slate-400 max-w-md">
          <svg
            className="mx-auto h-12 w-12 mb-4 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            字幕データがありません
          </h3>
          <p className="text-sm">
            この動画には字幕が含まれていないか、
            <br />
            字幕の取得に失敗しました
          </p>
        </div>
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
                  {formatTimestamp(startTime)}
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
