"use client";

interface Chapter {
  id: string;
  title: string;
  startTime: number;
  summary: string | null;
}

interface ChapterListProps {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
}

// 秒数を MM:SS 形式に変換
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ChapterList({ chapters, currentTime, onSeek }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400">
        <p className="text-sm">目次はまだ生成されていません</p>
        <p className="text-xs mt-2">
          動画を分析すると、自動的に目次が作成されます
        </p>
      </div>
    );
  }

  // 現在再生中のチャプターを特定
  const currentChapterIndex = chapters.findIndex((chapter, index) => {
    const nextChapter = chapters[index + 1];
    if (nextChapter) {
      return currentTime >= chapter.startTime && currentTime < nextChapter.startTime;
    }
    return currentTime >= chapter.startTime;
  });

  return (
    <div className="divide-y divide-slate-700">
      {chapters.map((chapter, index) => {
        const isActive = index === currentChapterIndex;

        return (
          <button
            key={chapter.id}
            onClick={() => onSeek(chapter.startTime)}
            className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-700/50 ${
              isActive ? "bg-blue-500/20 border-l-2 border-blue-500" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 text-xs font-mono mt-0.5 ${
                  isActive ? "text-blue-400" : "text-slate-500"
                }`}
              >
                {formatTime(chapter.startTime)}
              </span>
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-medium truncate ${
                    isActive ? "text-blue-400" : "text-slate-200"
                  }`}
                >
                  {chapter.title}
                </h3>
                {chapter.summary && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {chapter.summary}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
