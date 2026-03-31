"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, MessageCircle, Check, CheckCheck, Image, Paperclip } from "lucide-react";
import { useMessages, useSendMessage, useUser, usePublicProfile, useOnlineStatus, useHeartbeat } from "@/lib/hooks";
import { buildImageUrl } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import api from "@/lib/api";

interface ChatMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  message_type: string;
  file_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

function formatDateSeparator(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return lang === "ru" ? "Сегодня" : "Today";
  if (date.toDateString() === yesterday.toDateString()) return lang === "ru" ? "Вчера" : "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function ReadStatus({ isMine, isRead, readAt }: { isMine: boolean; isRead: boolean; readAt: string | null }) {
  if (!isMine) return null;
  if (isRead) {
    return <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />;
  }
  return <Check className="w-3.5 h-3.5 text-white/40" />;
}

function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${isOnline ? "bg-green-500" : "bg-zinc-500"}`} />
  );
}

export default function ChatClient({ userId: userIdProp }: { userId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const userId = userIdProp || (params?.userId as string) || "";
  const { data: user } = useUser();
  const { data: messages } = useMessages(userId);
  const { data: profile } = usePublicProfile(userId);
  const { data: onlineStatus } = useOnlineStatus(userId);
  const sendMessage = useSendMessage();
  const heartbeat = useHeartbeat();
  const { t, lang } = useI18n();
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    heartbeat.mutate();
    const interval = setInterval(() => heartbeat.mutate(), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate({ userId, content: content.trim() });
    setContent("");
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/upload/image", formData);
      const isImage = file.type.startsWith("image/");
      sendMessage.mutate({
        userId,
        content: isImage ? "" : file.name,
        message_type: isImage ? "image" : "file",
        file_url: data.url,
      });
    } catch {
      // upload failed silently
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  messages?.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.created_at, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  return (
    <div className="min-h-screen flex flex-col bg-bionic-bg">
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative w-10 h-10 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {profile?.avatar_url ? (
              <img src={buildImageUrl(profile.avatar_url)} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile?.username || "?")[0].toUpperCase()
            )}
          </div>
          <OnlineDot isOnline={onlineStatus?.is_online ?? false} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{profile?.username || "Chat"}</h1>
          <p className="text-[11px] text-bionic-text-dim">
            {onlineStatus?.is_online ? (
              <span className="text-green-400">{t("chat.online")}</span>
            ) : (
              <span>{profile?.is_focusing ? "🎯 " : ""}{t("common.loading")}</span>
            )}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-1">
          {groupedMessages.length === 0 && !messages?.length && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-bionic-accent/50" />
              </div>
              <p className="text-bionic-text-dim">{t("chat.noMessages")}</p>
              <p className="text-sm text-bionic-text-dim/60 mt-1">{t("chat.startConversation")}</p>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center py-3">
                <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] text-bionic-text-dim font-medium">
                  {formatDateSeparator(group.date, lang)}
                </span>
              </div>

              {group.messages.map((msg, idx) => {
                const isMine = msg.from_user_id === user?.id;
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const showAvatar = !isMine && (!prevMsg || prevMsg.from_user_id !== msg.from_user_id);
                const nextMsg = idx < group.messages.length - 1 ? group.messages[idx + 1] : null;
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
                    <div className={`max-w-[75%] sm:max-w-[65%] px-3.5 py-2 ${
                      isMine
                        ? `bg-gradient-to-br from-violet-600 to-cyan-600 text-white ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-r-sm"}`
                        : `bg-white/[0.08] text-white ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl rounded-l-sm"}`
                    }`}>
                      {/* Image message */}
                      {msg.message_type === "image" && msg.file_url && (
                        <div className="mb-1 -mx-1 -mt-1">
                          <img
                            src={buildImageUrl(msg.file_url)}
                            alt="Image"
                            className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                            onClick={() => window.open(buildImageUrl(msg.file_url), "_blank")}
                          />
                        </div>
                      )}
                      {/* File message */}
                      {msg.message_type === "file" && msg.file_url && (
                        <a href={buildImageUrl(msg.file_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                          <Paperclip className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{msg.content || "File"}</span>
                        </a>
                      )}
                      {/* Text content */}
                      {msg.content && msg.message_type !== "file" && (
                        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                      )}
                      {/* Time + read status */}
                      {isLastInGroup && (
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-end"}`}>
                          <span className={`text-[10px] ${isMine ? "text-white/50" : "text-zinc-500"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <ReadStatus isMine={isMine} isRead={msg.is_read} readAt={msg.read_at} />
                        </div>
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
            <input ref={fileInputRef} type="file" accept="image/*,*/*" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-3 rounded-2xl bg-white/[0.07] border border-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0">
              {uploading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full animate-spin block" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </button>
            <input
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t("chat.message")}
              className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.07] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-bionic-accent/40 focus:border-transparent text-[15px] transition-all"
            />
            <button onClick={handleSend} disabled={!content.trim() || sendMessage.isPending} className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white disabled:opacity-30 hover:from-violet-500 hover:to-cyan-500 transition-all flex-shrink-0">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
