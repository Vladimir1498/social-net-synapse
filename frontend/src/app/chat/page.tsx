"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useConversations } from "@/lib/hooks";

export default function ChatListPage() {
  const router = useRouter();
  const { data: conversations } = useConversations();

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-bionic-accent" />
          <h1 className="text-2xl font-bold text-bionic-text">Messages</h1>
        </div>
      </header>

      <div className="space-y-2">
        {conversations?.map((conv) => (
          <button key={conv.user_id} onClick={() => router.push(`/chat/${conv.user_id}`)} className="w-full glass-card p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative">
              {conv.username[0].toUpperCase()}
              {conv.unread_count > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{conv.unread_count}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold truncate">{conv.username}</span>
                <span className="text-xs text-bionic-text-dim">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ""}</span>
              </div>
              <p className="text-sm text-bionic-text-dim truncate">{conv.last_message}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
          </button>
        ))}
        {(!conversations || conversations.length === 0) && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-bionic-text-dim mx-auto mb-3" />
            <p className="text-bionic-text-dim">No conversations yet</p>
            <p className="text-sm text-bionic-text-dim/60 mt-1">Connect with people to start chatting</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
