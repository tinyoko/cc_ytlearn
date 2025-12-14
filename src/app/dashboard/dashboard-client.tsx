"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { LogoutButton } from "@/components/auth/logout-button";
import { ImportModal } from "@/components/import/import-modal";

interface Video {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: Date;
}

interface DashboardClientProps {
  user: {
    name: string | null;
    image: string | null;
  };
  initialVideos: Video[];
}

export function DashboardClient({ user, initialVideos }: DashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videos, setVideos] = useState(initialVideos);
  const router = useRouter(); // Initialize router

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
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

  const handleImportComplete = () => {
    // ページをリロードして最新の動画を取得
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">
            YouTube Learning Companion
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-slate-300 text-sm">{user.name}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダーセクション */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">ダッシュボード</h2>
            <p className="text-slate-400 mt-1">
              インポートした動画を管理・学習できます
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            動画をインポート
          </button>
        </div>

        {/* 動画一覧 */}
        {videos.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-200 mb-2">
              まだ動画がありません
            </h3>
            <p className="text-slate-400 mb-6">
              YouTubeから動画をインポートして、学習を始めましょう
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              動画をインポート
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative group bg-slate-800 rounded-lg overflow-hidden hover:bg-slate-750 transition-colors cursor-pointer"
                onClick={() => router.push(`/learn/${video.id}`)}
              >
                <div className="block h-full">
                  <div className="relative">
                    <img
                      src={video.thumbnailUrl || "/placeholder.png"}
                      alt={video.title}
                      className="w-full aspect-video object-cover"
                    />
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded">
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-slate-100 line-clamp-2 group-hover:text-blue-400 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(video.createdAt).toLocaleDateString("ja-JP")} に追加
                    </p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Confirm removed per user request (popup issues)
                      try {
                        const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
                        if (res.ok) {
                          setVideos(videos.filter(v => v.id !== video.id));
                        } else {
                          alert("削除に失敗しました");
                        }
                      } catch (err) {
                        alert("エラーが発生しました");
                      }
                    }}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded shadow-lg cursor-pointer"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* インポートモーダル */}
      <ImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </main>
  );
}
