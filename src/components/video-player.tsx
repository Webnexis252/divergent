"use client";

import { useRef, useEffect } from "react";
import { Plyr, type APITypes, type PlyrProps } from "plyr-react";
import "plyr-react/plyr.css";

// You can customize Plyr options here
const plyrOptions = {
  controls: [
    "play-large",
    "play",
    "progress",
    "current-time",
    "mute",
    "volume",
    "captions",
    "settings",
    "pip",
    "airplay",
    "fullscreen",
  ],
  settings: ["captions", "quality", "speed"],
  youtube: { noCookie: false, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
  vimeo: { byline: false, portrait: false, title: false, speed: true, transparent: false },
};

type CustomVideoPlayerProps = {
  videoUrl: string;
  posterUrl?: string;
  onEnded?: () => void;
  onProgress?: (progressSecs: number) => void;
  initialProgressSecs?: number;
};

export function CustomVideoPlayer({
  videoUrl,
  posterUrl,
  onEnded,
  onProgress,
  initialProgressSecs = 0,
}: CustomVideoPlayerProps) {
  const ref = useRef<APITypes>(null);

  // Parse the video URL to determine provider (YouTube, Vimeo, or HTML5)
  let provider = "html5";
  let videoId = videoUrl;

  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
    provider = "youtube";
    // Extract YouTube ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    videoId = match && match[2].length === 11 ? match[2] : videoUrl;
  } else if (videoUrl.includes("vimeo.com")) {
    provider = "vimeo";
    const regExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    const match = videoUrl.match(regExp);
    videoId = match ? match[1] : videoUrl;
  }

  const plyrSource = {
    type: "video",
    sources: [
      {
        src: videoId,
        provider: provider as "html5" | "youtube" | "vimeo",
      },
    ],
    poster: posterUrl,
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (ref.current && ref.current.plyr) {
      const player = ref.current.plyr;

      // Handle seeking to initial progress once loaded
      let initialSeekDone = false;
      player.on("canplay", () => {
        if (!initialSeekDone && initialProgressSecs > 0) {
          player.currentTime = initialProgressSecs;
          initialSeekDone = true;
        }
      });

      // Handle ended
      player.on("ended", () => {
        if (onEnded) onEnded();
      });

      // Track progress periodically while playing
      if (onProgress) {
        interval = setInterval(() => {
          if (player.playing) {
            onProgress(player.currentTime);
          }
        }, 5000); // report every 5 seconds
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [onEnded, onProgress, initialProgressSecs]);

  return (
    <div className="custom-player-wrapper">
      <Plyr
        ref={ref}
        source={plyrSource as PlyrProps["source"]}
        options={plyrOptions}
      />
      
      <style jsx global>{`
        .custom-player-wrapper {
          border-radius: var(--radius-lg, 16px);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          background: #000;
        }
        
        /* Modernize Plyr appearance matching our design system */
        .plyr--video {
          --plyr-color-main: var(--brand-primary-strong, #38c1ff);
          --plyr-video-background: #000;
          --plyr-menu-background: rgba(20, 20, 20, 0.9);
          --plyr-menu-color: #fff;
          --plyr-tooltip-background: rgba(0,0,0,0.85);
          --plyr-tooltip-color: #fff;
          --plyr-font-family: inherit;
        }
        
        .plyr__control--overlaid {
          background: var(--brand-primary-strong, #38c1ff) !important;
        }
        
        .plyr--full-ui.plyr--video .plyr__control--overlaid {
          border-radius: 50%;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}
