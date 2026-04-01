"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useConversations } from "@/lib/hooks";
import { buildImageUrl, formatRelativeTime } from "@/lib/utils";

export default function ChatListPage() {
  const router = useRouter();
  const { data: conversations } = useConversations();

  return (
    <div className="page-container mx-auto">
      <header className="section-gap">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <h1 className="heading-1">Messages</h1>
        </div>
      </header>

      <div className="space-y-2">
        {conversations?.map((conv) => (
          <button key={conv.user_id} onClick={() => router.push(`/chat/${conv.user_id}`)} className="w-full glass-card p-3 sm:p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left animate-fade-in">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 relative overflow-hidden">
              {conv.avatar_url ? (
                <img src={buildImageUrl(conv.avatar_url)} alt="" className="w-full h-full object-cover" />
              ) : (
                conv.username[0].toUpperCase()
              )}
              {conv.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900" />
              )}
              {conv.unread_count > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center z-10 font-bold">{conv.unread_count > 9 ? "9+" : conv.unread_count}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate text-sm sm:text-base">{conv.username}</span>
                <span className="text-xs text-bionic-text-dim flex-shrink-0">{conv.last_message_at ? formatRelativeTime(conv.last_message_at) : ""}</span>
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
