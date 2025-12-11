"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
}

export interface YouTubePlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, onTimeUpdate, onReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YT.Player | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isReady, setIsReady] = useState(false);

    // 外部からアクセス可能なメソッドを公開
    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        playerRef.current?.seekTo(time, true);
      },
      play: () => {
        playerRef.current?.playVideo();
      },
      pause: () => {
        playerRef.current?.pauseVideo();
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime() || 0;
      },
    }));

    useEffect(() => {
      // YouTube IFrame API を読み込み
      const loadYouTubeAPI = () => {
        if (window.YT) {
          initPlayer();
          return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = initPlayer;
      };

      const initPlayer = () => {
        if (!containerRef.current || playerRef.current) return;

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            iv_load_policy: 3, // アノテーション非表示
          },
          events: {
            onReady: () => {
              setIsReady(true);
              onReady?.();
              startTimeTracking();
            },
            onStateChange: (event: YT.OnStateChangeEvent) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                startTimeTracking();
              } else {
                stopTimeTracking();
              }
            },
          },
        });
      };

      const startTimeTracking = () => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
          if (playerRef.current && onTimeUpdate) {
            const time = playerRef.current.getCurrentTime();
            onTimeUpdate(time);
          }
        }, 500);
      };

      const stopTimeTracking = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      loadYouTubeAPI();

      return () => {
        stopTimeTracking();
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [videoId, onTimeUpdate, onReady]);

    return (
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
    );
  }
);
