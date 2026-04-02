"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, MessageCircle, Clock, Check, X } from "lucide-react";
import { useConnections, usePendingConnections, useConnect } from "@/lib/hooks";
import { getTierInfo, buildImageUrl } from "@/lib/utils";

export default function ConnectionsPage() {
  const router = useRouter();
  const { data: connections, refetch: refetchConnections } = useConnections();
  const { data: pending, refetch: refetchPending } = usePendingConnections();
  const acceptConnection = useConnect();
  const [tab, setTab] = useState<"connections" | "pending">("connections");

  const handleAccept = (userId: string) => {
    acceptConnection.mutate(
      { to_user_id: userId },
      {
        onSuccess: () => {
          refetchConnections();
          refetchPending();
        },
      },
    );
  };

  return (
    <div className="page-container mx-auto">
      <header className="section-gap">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <h1 className="heading-1">Connections</h1>
        </div>
      </header>

      <div className="flex gap-2 mb-5 sm:mb-6">
        <button onClick={() => setTab("connections")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === "connections" ? "bg-bionic-accent text-bionic-bg" : "glass-button text-bionic-text-dim"}`}>
          Connected ({connections?.length || 0})
        </button>
        <button onClick={() => setTab("pending")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${tab === "pending" ? "bg-bionic-accent text-bionic-bg" : "glass-button text-bionic-text-dim"}`}>
          Pending ({pending?.length || 0})
          {pending && pending.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">{pending.length}</span>}
        </button>
      </div>

      {tab === "connections" && (
        <div className="space-y-2 sm:space-y-3">
          {connections?.map((conn) => (
            <div key={conn.user_id} className="glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-fade-in">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 overflow-hidden">
                {conn.avatar_url ? (
                  <img src={buildImageUrl(conn.avatar_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  conn.username[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate text-sm sm:text-base">{conn.username}</span>
                  <span className="text-sm" title={getTierInfo(conn.impact_score).name}>{getTierInfo(conn.impact_score).icon}</span>
                  {conn.is_focusing && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                </div>
                <p className="text-xs sm:text-sm text-bionic-text-dim truncate">{conn.current_goal || conn.bio || "No goal set"}</p>
              </div>
              <button onClick={() => router.push(`/chat/${conn.user_id}`)} className="p-2 sm:p-2.5 rounded-full bg-bionic-accent/10 hover:bg-bionic-accent/20 transition-colors flex-shrink-0">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-bionic-accent" />
              </button>
            </div>
          ))}
          {(!connections || connections.length === 0) && (
            <div className="text-center py-12 sm:py-16">
              <Users className="w-14 h-14 sm:w-16 sm:h-16 text-bionic-text-dim/30 mx-auto mb-4" />
              <p className="text-bionic-text-dim text-base sm:text-lg">No connections yet</p>
              <p className="text-sm text-bionic-text-dim/60 mt-2">Visit Radar to discover people nearby</p>
              <button onClick={() => router.push("/radar")} className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium">
                Open Radar
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-2 sm:space-y-3">
          {pending?.map((conn) => (
            <div key={conn.user_id} className="glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-fade-in">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 overflow-hidden">
                {conn.avatar_url ? (
                  <img src={buildImageUrl(conn.avatar_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  conn.username[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold truncate block text-sm sm:text-base">{conn.username}</span>
                <p className="text-xs sm:text-sm text-bionic-text-dim truncate">{conn.bio || conn.current_goal || "Wants to connect"}</p>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                <button onClick={() => handleAccept(conn.user_id)} disabled={acceptConnection.isPending} className="p-2 sm:p-2.5 rounded-full bg-green-500/20 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                </button>
                <button className="p-2 sm:p-2.5 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
          {(!pending || pending.length === 0) && (
            <div className="text-center py-12 sm:py-16">
              <Clock className="w-14 h-14 sm:w-16 sm:h-16 text-bionic-text-dim/30 mx-auto mb-4" />
              <p className="text-bionic-text-dim text-base sm:text-lg">No pending requests</p>
              <p className="text-sm text-bionic-text-dim/60 mt-2">When someone wants to connect, you will see it here</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
