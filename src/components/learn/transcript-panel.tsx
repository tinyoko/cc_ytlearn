"use client";

import { useRef, useEffect } from "react";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptPanelProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
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

  // 現在再生中のセグメントを特定
  const currentSegmentIndex = transcript.findIndex((segment) => {
    const endTime = segment.start + segment.duration;
    return currentTime >= segment.start && currentTime < endTime;
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

          return (
            <button
              key={`${segment.start}-${index}`}
              ref={isActive ? activeRef : null}
              onClick={() => onSeek(segment.start)}
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
                  {formatTime(segment.start)}
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
