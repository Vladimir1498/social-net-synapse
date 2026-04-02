"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, User, FileText, Zap } from "lucide-react";
import { useSearch } from "@/lib/hooks";
import { formatRelativeTime, getTierInfo, buildImageUrl } from "@/lib/utils";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "users" | "posts">("all");
  const { data: results } = useSearch(query, type);

  return (
    <div className="page-container mx-auto">
      <header className="section-gap">
        <div className="flex items-center gap-3 mb-4">
          <SearchIcon className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <h1 className="heading-1">Search</h1>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, posts, goals..."
          className="w-full px-4 py-3 rounded-xl glass-input text-bionic-text text-sm sm:text-base"
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          {(["all", "users", "posts"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-all ${type === t ? "bg-bionic-accent text-bionic-bg" : "glass-button text-bionic-text-dim"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {query.length >= 2 && results && (
        <div className="space-y-5 sm:space-y-6">
          {results.users.length > 0 && (type === "all" || type === "users") && (
            <div>
              <h2 className="text-sm font-medium text-bionic-text-dim mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Users</h2>
              <div className="space-y-2">
                {results.users.map((u) => (
                  <button key={u.id} onClick={() => router.push(`/profile/${u.id}`)} className="w-full glass-card p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        <img src={buildImageUrl(u.avatar_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{u.username}</span>
                        <span className="text-sm" title={getTierInfo(u.impact_score).name}>{getTierInfo(u.impact_score).icon}</span>
                      </div>
                      <p className="text-sm text-bionic-text-dim truncate">{u.current_goal || u.bio || ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {results.posts.length > 0 && (type === "all" || type === "posts") && (
            <div>
              <h2 className="text-sm font-medium text-bionic-text-dim mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Posts</h2>
              <div className="space-y-2">
                {results.posts.map((p) => (
                  <div key={p.id} className="glass-card p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">@{p.author_username}</span>
                      <span className="text-xs text-bionic-text-dim">{formatRelativeTime(p.created_at)}</span>
                    </div>
                    <p className="text-sm text-bionic-text line-clamp-2">{p.content}</p>
                    {p.image_url && <img src={buildImageUrl(p.image_url)} alt="" className="mt-2 rounded-lg max-h-32 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <div className="flex items-center gap-1 mt-2 text-xs text-bionic-text-dim">
                      <Zap className="w-3 h-3 text-violet-400" /> {p.impact_count} impacts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {results.users.length === 0 && results.posts.length === 0 && (
            <p className="text-center text-bionic-text-dim py-8">No results found</p>
          )}
        </div>
      )}

    </div>
  );
}
