"use client";

import { useState, useRef, useCallback, memo } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { YouTubePlayer, YouTubePlayerRef } from "@/components/player/youtube-player";
import { ChapterList } from "@/components/learn/chapter-list";
import { TranscriptPanel } from "@/components/learn/transcript-panel";
import { ChatPanel } from "@/components/learn/chat-panel";

interface Chapter {
  id: string;
  title: string;
  startTime: number;
  summary: string | null;
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface LearnClientProps {
  video: {
    id: string;
    videoId: string;
    title: string;
    duration: number | null;
  };
  transcript: TranscriptSegment[];
  chapters: Chapter[];
}

export function LearnClient({ video, transcript, chapters: initialChapters }: LearnClientProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(0);
  const [chapters, setChapters] = useState(initialChapters);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayerRef | null>(null);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seekTo(time);
    setCurrentTime(time);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // トランスクリプト分析を実行
  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "分析に失敗しました");
      }

      const result = await response.json();

      // チャプターを更新
      setChapters(
        result.chapters.map((ch: { title: string; startTime: number; summary: string }, i: number) => ({
          id: `generated-${i}`,
          title: ch.title,
          startTime: ch.startTime,
          summary: ch.summary,
        }))
      );

      // ページをリフレッシュして最新データを取得
      router.refresh();
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalyzeError(error instanceof Error ? error.message : "分析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  }, [video.id, isAnalyzing, router]);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* ヘッダー */}
      <header className="flex-shrink-0 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-medium text-slate-100 truncate">
            {video.title}
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full" autoSaveId="learn-layout-horizontal">
          {/* 左パネル: 目次 */}
          <Panel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full flex flex-col bg-slate-800 border-r border-slate-700">
              <header className="flex border-b border-slate-700">
                <h2 className="flex-1 px-4 py-3 text-sm font-medium text-blue-400 border-b-2 border-blue-400">
                  目次
                </h2>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ChapterListWithAnalyze
                  chapters={chapters}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                  hasTranscript={transcript.length > 0}
                  error={analyzeError}
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle
            className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize"
            aria-label="目次パネルのリサイズハンドル"
          />

          {/* 中央パネル: 動画プレーヤーと字幕 */}
          <Panel defaultSize={55} minSize={40}>
            <PanelGroup direction="vertical" className="h-full" autoSaveId="learn-layout-vertical">
              {/* 動画プレーヤー */}
              <Panel defaultSize={60} minSize={30}>
                <div className="h-full flex flex-col bg-slate-900">
                  <div className="flex-1 min-h-0 p-4">
                    <YouTubePlayer
                      ref={playerRef}
                      videoId={video.videoId}
                      onTimeUpdate={handleTimeUpdate}
                    />
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle
                className="h-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-row-resize"
                aria-label="動画と字幕の境界リサイズハンドル"
              />

              {/* 字幕 */}
              <Panel defaultSize={40} minSize={20}>
                <div className="h-full flex flex-col bg-slate-800 border-t border-slate-700">
                  <header className="flex border-b border-slate-700">
                    <h2 className="flex-1 px-4 py-3 text-sm font-medium text-blue-400 border-b-2 border-blue-400">
                      字幕
                    </h2>
                  </header>
                  <div className="flex-1 min-h-0">
                    <TranscriptPanel
                      transcript={transcript}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                    />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle
            className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize"
            aria-label="チャットパネルのリサイズハンドル"
          />

          {/* 右パネル: チャット */}
          <Panel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full bg-slate-800 border-l border-slate-700">
              <ChatPanel
                videoId={video.id}
                transcript={transcript}
                onSeek={handleSeek}
              />
            </div>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}

// 分析ボタン付きチャプターリスト（メモ化してパフォーマンス向上）
const ChapterListWithAnalyze = memo(function ChapterListWithAnalyze({
  chapters,
  currentTime,
  onSeek,
  onAnalyze,
  isAnalyzing,
  hasTranscript,
  error,
}: {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  hasTranscript: boolean;
  error: string | null;
}) {
  if (chapters.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 text-sm mb-4">
          目次はまだ生成されていません
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        {hasTranscript ? (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                分析中...
              </span>
            ) : error ? (
              "再試行"
            ) : (
              "AIで目次を生成"
            )}
          </button>
        ) : (
          <p className="text-xs text-slate-500">
            字幕データがないため分析できません
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* エラー表示 */}
      {error && (
        <div className="p-2 border-b border-slate-700">
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {error}
          </div>
        </div>
      )}
      {/* 再分析ボタン */}
      {hasTranscript && (
        <div className="p-2 border-b border-slate-700">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? "分析中..." : "再分析"}
          </button>
        </div>
      )}
      <ChapterList
        chapters={chapters}
        currentTime={currentTime}
        onSeek={onSeek}
      />
    </div>
  );
});
