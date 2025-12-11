"use client";

import { useState, useRef, useEffect, type ReactNode, useCallback } from "react";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  videoId: string;
  transcript: TranscriptSegment[];
  onSeek: (time: number) => void;
}

export function ChatPanel({ videoId, transcript, onSeek }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // チャット履歴をAPI用に変換
  const getChatHistory = useCallback(() => {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    // AbortControllerをセットアップ
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          message: userMessage.content,
          history: getChatHistory(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "チャットに失敗しました");
      }

      // ストリーミングレスポンスを処理
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("ストリームを取得できませんでした");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      }

      // ストリーミング完了後、メッセージとして追加
      if (accumulatedContent) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: accumulatedContent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // キャンセルされた場合
        return;
      }
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "エラーが発生しました。もう一度お試しください。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  // タイムスタンプをパースしてシーク可能なリンクに変換
  const renderMessageContent = (content: string) => {
    // MM:SS 形式のタイムスタンプを検出
    const timestampRegex = /(\d{1,2}):(\d{2})/g;

    const result: ReactNode[] = [];
    let i = 0;
    let match;
    let lastIndex = 0;

    while ((match = timestampRegex.exec(content)) !== null) {
      // マッチ前のテキスト
      if (match.index > lastIndex) {
        result.push(content.slice(lastIndex, match.index));
      }

      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const timeInSeconds = minutes * 60 + seconds;

      result.push(
        <button
          key={`timestamp-${i++}`}
          onClick={() => onSeek(timeInSeconds)}
          className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
        >
          {match[0]}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // 残りのテキスト
    if (lastIndex < content.length) {
      result.push(content.slice(lastIndex));
    }

    return result.length > 0 ? result : content;
  };

  const hasTranscript = transcript.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-medium text-slate-200">
          動画について質問する
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {hasTranscript
            ? "トランスクリプトの内容に基づいて回答します"
            : "字幕データがないためチャットは利用できません"}
        </p>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="text-center text-slate-400 py-8">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">
              動画の内容について
              <br />
              何でも質問してください
            </p>
            {hasTranscript && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-500">質問の例:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "この動画の要点は?",
                    "主なトピックを教えて",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-100"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderMessageContent(message.content)}
                  </p>
                </div>
              </div>
            ))}
            {/* ストリーミング中のメッセージ */}
            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-slate-700 text-slate-100">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderMessageContent(streamingContent)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        {isLoading && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 p-4 border-t border-slate-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasTranscript ? "質問を入力..." : "字幕データがありません"}
            disabled={isLoading || !hasTranscript}
            className="flex-1 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !hasTranscript}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
}
