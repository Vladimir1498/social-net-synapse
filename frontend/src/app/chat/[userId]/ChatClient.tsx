"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useMessages, useSendMessage, useUser } from "@/lib/hooks";

export default function ChatClient({ userId: userIdProp }: { userId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const userId = userIdProp || (params?.userId as string) || "";
  const { data: user } = useUser();
  const { data: messages } = useMessages(userId);
  const sendMessage = useSendMessage();
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate({ userId, content: content.trim() });
    setContent("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-white/10 bg-zinc-900/90 backdrop-blur-sm">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Chat</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.map((msg) => {
          const isMine = msg.from_user_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine ? "bg-bionic-accent text-bionic-bg rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>
                <p className="text-sm break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMine ? "text-bionic-bg/60" : "text-zinc-500"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-bionic-accent/50"
          />
          <button onClick={handleSend} disabled={!content.trim() || sendMessage.isPending} className="p-3 rounded-xl bg-bionic-accent text-bionic-bg disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
