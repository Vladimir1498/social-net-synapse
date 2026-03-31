"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { useMessages, useSendMessage, useUser, usePublicProfile } from "@/lib/hooks";
import { buildImageUrl } from "@/lib/utils";

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function ChatClient({ userId: userIdProp }: { userId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const userId = userIdProp || (params?.userId as string) || "";
  const { data: user } = useUser();
  const { data: messages } = useMessages(userId);
  const { data: profile } = usePublicProfile(userId);
  const sendMessage = useSendMessage();
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate({ userId, content: content.trim() });
    setContent("");
    inputRef.current?.focus();
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentDate = "";

  messages?.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.created_at, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages!.push(msg);
  });

  return (
    <div className="min-h-screen flex flex-col bg-bionic-bg">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={buildImageUrl(profile.avatar_url)} alt="" className="w-full h-full object-cover" />
          ) : (
            (profile?.username || "?")[0].toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{profile?.username || "Chat"}</h1>
          {profile?.is_focusing && (
            <span className="text-[11px] text-indigo-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Focusing
            </span>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-1">
          {groupedMessages.length === 0 && !messages?.length && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-bionic-accent/50" />
              </div>
              <p className="text-bionic-text-dim">No messages yet</p>
              <p className="text-sm text-bionic-text-dim/60 mt-1">Send a message to start the conversation</p>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center py-3">
                <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] text-bionic-text-dim font-medium">
                  {formatDateSeparator(group.date)}
                </span>
              </div>

              {/* Messages for this date */}
              {group.messages!.map((msg, idx) => {
                const isMine = msg.from_user_id === user?.id;
                const prevMsg = idx > 0 ? group.messages![idx - 1] : null;
                const showAvatar = !isMine && (!prevMsg || prevMsg.from_user_id !== msg.from_user_id);
                const nextMsg = idx < group.messages!.length - 1 ? group.messages![idx + 1] : null;
                const isLastInGroup = !nextMsg || nextMsg.from_user_id !== msg.from_user_id;

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>
                    {!isMine && (
                      <div className="w-7 flex-shrink-0 mr-2">
                        {showAvatar && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold mt-auto overflow-hidden">
                            {profile?.avatar_url ? (
                              <img src={buildImageUrl(profile.avatar_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (profile?.username || "?")[0].toUpperCase()
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-[65%] px-3.5 py-2 ${
                        isMine
                          ? `bg-gradient-to-br from-violet-600 to-cyan-600 text-white ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-r-sm"}`
                          : `bg-white/[0.08] text-white ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl rounded-l-sm"}`
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                      {isLastInGroup && (
                        <p className={`text-[10px] mt-1 ${isMine ? "text-white/50" : "text-zinc-500"} text-right`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/10 bg-zinc-900/95 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message..."
              className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.07] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-bionic-accent/40 focus:border-transparent text-[15px] transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!content.trim() || sendMessage.isPending}
              className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white disabled:opacity-30 hover:from-violet-500 hover:to-cyan-500 transition-all flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
