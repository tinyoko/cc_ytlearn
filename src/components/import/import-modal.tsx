"use client";

import { useState } from "react";
import { VideoSelector } from "./video-selector";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type ImportSource = "my-videos" | "playlist" | null;

export function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const [source, setSource] = useState<ImportSource>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistError, setPlaylistError] = useState("");

  if (!isOpen) return null;

  const handleSourceSelect = (selectedSource: ImportSource) => {
    setSource(selectedSource);
    setPlaylistError("");
  };

  const handleBack = () => {
    setSource(null);
    setPlaylistUrl("");
    setPlaylistError("");
  };

  const handlePlaylistSubmit = () => {
    // YouTubeプレイリストURLのバリデーション
    const playlistPattern = /(?:youtube\.com\/.*[?&]list=|^)(PL[a-zA-Z0-9_-]+)/;
    if (!playlistPattern.test(playlistUrl)) {
      setPlaylistError("有効なYouTubeプレイリストURLを入力してください");
      return;
    }
    setPlaylistError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {source && (
              <button
                onClick={handleBack}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
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
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-100">
              動画をインポート
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {!source ? (
            // ソース選択画面
            <div className="space-y-4">
              <p className="text-slate-400 mb-6">
                インポート元を選択してください
              </p>
              <button
                onClick={() => handleSourceSelect("my-videos")}
                className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <svg
                      className="w-6 h-6 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-100">
                      自分のアップロード動画
                    </h3>
                    <p className="text-sm text-slate-400">
                      あなたのYouTubeチャンネルからインポート
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSourceSelect("playlist")}
                className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-lg">
                    <svg
                      className="w-6 h-6 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-100">
                      プレイリストからインポート
                    </h3>
                    <p className="text-sm text-slate-400">
                      YouTubeプレイリストのURLを指定
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ) : source === "playlist" && !playlistUrl.match(/list=/) ? (
            // プレイリストURL入力画面
            <div className="space-y-4">
              <p className="text-slate-400">
                YouTubeプレイリストのURLを入力してください
              </p>
              <input
                type="text"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {playlistError && (
                <p className="text-red-400 text-sm">{playlistError}</p>
              )}
              <button
                onClick={handlePlaylistSubmit}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                動画を取得
              </button>
            </div>
          ) : (
            // 動画選択画面
            <VideoSelector
              source={source}
              playlistUrl={source === "playlist" ? playlistUrl : undefined}
              onImportComplete={() => {
                onImportComplete();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
