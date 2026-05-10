"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";

import { ImagePlus, SendHorizontal, MessageCircleMore, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { formatMessageTime } from "@/lib/live-class-utils";
import type { LiveClassMessage } from "@/lib/live-class-types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";

function MessageBubble({
  currentUserId,
  message,
}: {
  currentUserId: string | undefined;
  message: LiveClassMessage;
}) {
  const isCurrentUser = message.senderId === currentUserId;
  const isMentorReply =
    message.senderRole === "MENTOR" ||
    message.senderRole === "ADMIN" ||
    message.senderRole === "SUPER_ADMIN";

  return (
    <div className={cx("flex", isCurrentUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[88%] rounded-[22px] px-4 py-4 shadow-[0_6px_18px_rgba(0,0,0,0.06)]",
          isCurrentUser
            ? "bg-[#38c1ff] text-white"
            : isMentorReply
              ? "bg-[#fff5c6] text-black"
              : "bg-white text-black",
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={cx("font-semibold", isCurrentUser ? "text-white" : "text-black/78")}>
            {message.senderName}
          </span>
          {isMentorReply ? (
            <span className="rounded-full bg-black/6 px-2 py-0.5 uppercase tracking-[0.12em] text-black/55">
              Mentor
            </span>
          ) : null}
          <span className={cx(isCurrentUser ? "text-white/72" : "text-black/45")}>
            {formatMessageTime(message.createdAt)}
          </span>
        </div>

        {message.body ? (
          <p className={cx("text-[14px] leading-7", isCurrentUser ? "text-white" : "text-black/76")}>
            {message.body}
          </p>
        ) : null}

        {message.imageUrl ? (
          <div
            aria-label={`Attachment from ${message.senderName}`}
            className="mt-3 h-44 w-full rounded-[18px] bg-black/10"
            role="img"
            style={{
              backgroundImage: `url(${message.imageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

const fetcher = (url: string) =>
  apiClient.get<LiveClassMessage[]>(url, { cache: "no-store" });

export function ClassroomChat({
  classId,
  courseTitle,
  currentUserId,
  open,
  onToggleOpen,
}: {
  classId: string;
  courseTitle: string;
  currentUserId: string | undefined;
  open: boolean;
  onToggleOpen: (open: boolean) => void;
}) {
  const [messageBody, setMessageBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Poll for fresh messages while the panel is open so everyone in the room
  // sees new posts without a manual refresh.
  const { data: messages = [], isLoading: messagesLoading, mutate } = useSWR(
    open && classId ? `/api/live-classes/${classId}/messages` : null,
    fetcher,
    {
      refreshInterval: 2000,
      dedupingInterval: 0,
      revalidateOnFocus: true,
    },
  );

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages, open]);

  async function handleSendMessage() {
    if (!classId || sending) return;
    if (!messageBody.trim() && !selectedImage) return;

    setSending(true);
    setSendError("");

    try {
      const formData = new FormData();
      formData.append("body", messageBody);

      if (selectedImage) {
        formData.append("file", selectedImage);
      }

      const response = await fetch(`/api/live-classes/${classId}/messages`, {
        method: "POST",
        body: formData,
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        setSendError(json.error ?? "Could not send your message.");
        return;
      }

      await mutate([...messages, json.data], false);
      setMessageBody("");
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to send live message", error);
      setSendError("Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <section className="rounded-[28px] bg-white px-5 py-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:px-6 sm:py-8 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#38c1ff]/10 text-[#38c1ff]">
          <MessageCircleMore className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-[1.45rem] font-semibold tracking-[-0.04em] text-black">
          Thread hidden
        </h2>
        <p className="mx-auto mt-2 max-w-[32rem] text-[14px] leading-7 text-black/56">
          Reopen the message panel whenever you want the classroom discussion back in view.
        </p>
        <Button
          className="mt-5 w-full sm:w-auto"
          onClick={() => onToggleOpen(true)}
          size="lg"
          type="button"
        >
          <MessageCircleMore className="h-4 w-4" />
          Open messages
        </Button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4 border-b border-black/6 px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
            Class Thread
          </p>
          <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-black">
            Keep the class conversation close.
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-black/56">
            {courseTitle} discussion
          </p>
        </div>
        <button
          className="rounded-full p-2 text-black/46 transition-colors duration-[var(--transition-fast)] hover:bg-black/5 hover:text-black focus-visible:outline-none"
          onClick={() => onToggleOpen(false)}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="max-h-[420px] space-y-3 overflow-y-auto bg-[#f7f5f4] px-4 py-4 sm:max-h-[520px] sm:px-6 sm:py-6"
        ref={messagesContainerRef}
      >
        {messagesLoading ? (
          <div className="flex items-center gap-3 text-[14px] text-black/48">
            <Spinner className="h-4 w-4 border-[#38c1ff] text-[#38c1ff]" />
            Loading messages...
          </div>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble
              currentUserId={currentUserId}
              key={message.id}
              message={message}
            />
          ))
        ) : (
          <div className="flex min-h-[280px] items-center justify-center">
            <EmptyState
              description="No messages yet. Start with a quick note or an image attachment."
              icon={<MessageCircleMore className="h-6 w-6" />}
              title="Thread is quiet"
            />
          </div>
        )}
      </div>

      <div className="border-t border-black/6 bg-white px-4 py-4 sm:px-6 sm:py-5">
        {previewUrl ? (
          <div className="mb-4 rounded-[20px] border border-black/8 bg-[#f7f5f4] p-3">
            <div className="flex items-start gap-3">
              <div
                aria-label="Selected attachment preview"
                className="h-16 w-16 rounded-[16px] bg-black/10"
                role="img"
                style={{
                  backgroundImage: `url(${previewUrl})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-black/84">
                  {selectedImage?.name}
                </p>
                <button
                  className="mt-2 text-[12px] text-black/54 underline underline-offset-4"
                  onClick={() => setSelectedImage(null)}
                  type="button"
                >
                  Remove image
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {sendError ? (
          <p className="mb-3 rounded-[16px] border border-[rgba(255,61,0,0.16)] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[13px] text-[#d9480f]">
            {sendError}
          </p>
        ) : null}

        <div className="rounded-[20px] border border-black/8 bg-[#f7f5f4] p-3">
          <div className="flex items-center gap-2">
            <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-black/56 shadow-[0_4px_10px_rgba(0,0,0,0.04)] transition-colors duration-[var(--transition-fast)] hover:text-black">
              <ImagePlus className="h-4.5 w-4.5" />
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedImage(file);
                  setSendError("");
                }}
                type="file"
              />
            </label>

            <input
              className="min-w-0 flex-1 bg-transparent px-2 text-[14px] text-black outline-none placeholder:text-black/38"
              onChange={(event) => setMessageBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Send a note, question, or image for this class..."
              value={messageBody}
            />

            <Button
              className="px-3 sm:px-4"
              disabled={!messageBody.trim() && !selectedImage}
              loading={sending}
              onClick={() => void handleSendMessage()}
              size="sm"
              type="button"
            >
              <SendHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
