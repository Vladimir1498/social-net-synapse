"use client";

import { Bookmark, Zap, Trash2 } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useSavedPosts, useUnsavePost } from "@/lib/hooks";
import { formatRelativeTime, buildImageUrl } from "@/lib/utils";

export default function SavedPage() {
  const { data: savedPosts } = useSavedPosts();
  const unsave = useUnsavePost();

  return (
    <div className="page-container mx-auto">
      <header className="section-gap">
        <div className="flex items-center gap-3">
          <Bookmark className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <h1 className="heading-1">Saved Posts</h1>
        </div>
      </header>

      <div className="space-y-2 sm:space-y-3">
        {savedPosts?.map((post) => (
          <div key={post.id} className="glass-card p-3 sm:p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">@{post.author_username}</span>
              <span className="text-xs text-bionic-text-dim">{formatRelativeTime(post.created_at)}</span>
            </div>
            <p className="text-bionic-text text-sm sm:text-base">{post.content}</p>
            {post.image_url && <img src={buildImageUrl(post.image_url)} alt="" className="mt-2 rounded-lg max-h-40 sm:max-h-48 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-xs text-bionic-text-dim">
                <Zap className="w-3 h-3 text-violet-400" />
                <span>{post.impact_count} impacts</span>
              </div>
              <button onClick={() => unsave.mutate(post.id)} className="p-1.5 rounded-full hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {(!savedPosts || savedPosts.length === 0) && (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-bionic-text-dim mx-auto mb-3" />
            <p className="text-bionic-text-dim">No saved posts yet</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
