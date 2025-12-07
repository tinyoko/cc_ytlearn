"use client";

import { useState, useEffect } from "react";

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
  privacyStatus: string;
  description: string;
}

interface VideoSelectorProps {
  source: "my-videos" | "playlist";
  playlistUrl?: string;
  onImportComplete: () => void;
}

export function VideoSelector({
  source,
  playlistUrl,
  onImportComplete,
}: VideoSelectorProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchVideos();
  }, [source, playlistUrl]);

  const fetchVideos = async () => {
    setLoading(true);
    setError("");

    try {
      const url =
        source === "my-videos"
          ? "/api/youtube/my-videos"
          : `/api/youtube/playlist?url=${encodeURIComponent(playlistUrl || "")}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "動画の取得に失敗しました");
      }

      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(videos.map((v) => v.videoId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    setImporting(true);
    setProgress({ current: 0, total: selectedIds.size });

    try {
      const selectedVideos = videos.filter((v) => selectedIds.has(v.videoId));

      const response = await fetch("/api/videos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: selectedVideos }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "インポートエラー");
    } finally {
      setImporting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-slate-400">動画を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchVideos}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">動画が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 選択操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            全選択
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            選択解除
          </button>
        </div>
        <span className="text-sm text-slate-400">
          {selectedIds.size} / {videos.length} 件選択中
        </span>
      </div>

      {/* 動画リスト */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {videos.map((video) => (
          <div
            key={video.videoId}
            onClick={() => toggleSelect(video.videoId)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              selectedIds.has(video.videoId)
                ? "bg-blue-500/20 border border-blue-500/50"
                : "bg-slate-700 hover:bg-slate-600 border border-transparent"
            }`}
          >
            {/* チェックボックス */}
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                selectedIds.has(video.videoId)
                  ? "bg-blue-500 border-blue-500"
                  : "border-slate-500"
              }`}
            >
              {selectedIds.has(video.videoId) && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* サムネイル */}
            <div className="relative flex-shrink-0">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-24 h-14 object-cover rounded"
              />
              <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-xs rounded">
                {formatDuration(video.duration)}
              </span>
            </div>

            {/* タイトル */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-slate-100 truncate">
                {video.title}
              </h4>
              <p className="text-xs text-slate-400">
                {new Date(video.publishedAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* インポートボタン */}
      <div className="pt-4 border-t border-slate-700">
        <button
          onClick={handleImport}
          disabled={selectedIds.size === 0 || importing}
          className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {importing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              インポート中...
            </span>
          ) : (
            `${selectedIds.size} 件をインポート`
          )}
        </button>
      </div>
    </div>
  );
}
