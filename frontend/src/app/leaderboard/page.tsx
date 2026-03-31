"use client";

import { Trophy, Zap, Crown, Medal } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useLeaderboard } from "@/lib/hooks";
import { getTierInfo, buildImageUrl } from "@/lib/utils";

export default function LeaderboardPage() {
  const { data: leaderboard } = useLeaderboard();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-bionic-text-dim font-mono text-sm w-5 text-center">{rank}</span>;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-bionic-accent" />
          <h1 className="text-2xl font-bold text-bionic-text">Leaderboard</h1>
        </div>
        <p className="text-sm text-bionic-text-dim mt-1">Top impact creators</p>
      </header>

      <div className="space-y-2">
        {leaderboard?.map((entry) => (
          <div key={entry.id} className={`glass-card p-4 flex items-center gap-4 animate-fade-in ${entry.rank <= 3 ? "border border-bionic-accent/20" : ""}`}>
            <div className="w-8 flex justify-center flex-shrink-0">{getRankIcon(entry.rank)}</div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {entry.avatar_url ? (
                <img src={buildImageUrl(entry.avatar_url)} alt="" className="w-full h-full object-cover" />
              ) : (
                entry.username[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{entry.username}</span>
                <span className="text-sm" title={getTierInfo(entry.impact_score).name}>{getTierInfo(entry.impact_score).icon}</span>
                {entry.is_focusing && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
              </div>
              <p className="text-xs text-bionic-text-dim truncate">{entry.current_goal || "No goal set"}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-bionic-accent">{entry.impact_score}</div>
              <div className="text-xs text-bionic-text-dim">impact</div>
            </div>
          </div>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
}
