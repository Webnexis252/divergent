"use client";

import { motion } from "motion/react";
import { ExternalLink, PhoneOff } from "lucide-react";

interface VideoConferenceProps {
  meetingIframeUrl: string;
  onEndMeeting: () => void;
}

/**
 * Embeds a live video conference (Jitsi) inside the classroom layout.
 * Shows a "Live session in progress" header with pop-out and end controls,
 * plus the meeting iframe itself.
 */
export function VideoConference({
  meetingIframeUrl,
  onEndMeeting,
}: VideoConferenceProps) {
  return (
    <motion.div
      key="iframe"
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-[24px] bg-[#081b39] text-white shadow-[0_12px_30px_rgba(8,27,57,0.18)]"
      exit={{ opacity: 0, scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#16a34a] px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            className="h-2.5 w-2.5 rounded-full bg-white"
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          Live session in progress
        </div>
        <div className="flex items-center gap-2">
          <a
            className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/28"
            href={meetingIframeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Pop out
          </a>
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-[#dc2626] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#b91c1c]"
            onClick={onEndMeeting}
            type="button"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            End
          </button>
        </div>
      </div>

      <div className="bg-[#040404]">
        <iframe
          allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
          className="h-[420px] w-full border-0 lg:h-[560px]"
          referrerPolicy="no-referrer-when-downgrade"
          src={meetingIframeUrl}
          style={{ colorScheme: "normal" }}
        />
      </div>
    </motion.div>
  );
}
