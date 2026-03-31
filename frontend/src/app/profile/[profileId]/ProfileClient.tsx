"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Zap, MessageCircle, UserPlus, Target } from "lucide-react";
import { usePublicProfile, useUserPosts, useConnect, useConnectionStatus } from "@/lib/hooks";
import { formatRelativeTime, getTierInfo } from "@/lib/utils";
import { useState } from "react";

export default function ProfileClient({ profileId: profileIdProp }: { profileId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const profileId = profileIdProp || (params?.profileId as string) || "";
  const { data: profile } = usePublicProfile(profileId);
  const { data: postsData } = useUserPosts(profileId);
  const { data: connStatus } = useConnectionStatus(profileId);
  const connect = useConnect();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect.mutateAsync({ to_user_id: profileId });
    } finally {
      setConnecting(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      <header className="mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/10 mb-3">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-lg mx-auto">
        <div className="glass-card p-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {profile.username[0].toUpperCase()}
          </div>
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            {profile.username}
            <span className="text-lg" title={getTierInfo(profile.impact_score).name}>{getTierInfo(profile.impact_score).icon}</span>
          </h1>
          {profile.is_focusing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Focusing: {profile.current_focus_goal || "..."}
            </span>
          )}
          <p className="text-bionic-text-dim mt-2">{profile.bio || "No bio yet"}</p>
          {profile.current_goal && (
            <div className="mt-3 p-3 rounded-xl bg-white/5 flex items-center gap-2 text-left">
              <Target className="w-4 h-4 text-bionic-accent flex-shrink-0" />
              <span className="text-sm text-bionic-text">{profile.current_goal}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold text-bionic-accent">{profile.impact_score}</div>
              <div className="text-xs text-bionic-text-dim">Impact Score</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold">{profile.posts_count || 0}</div>
              <div className="text-xs text-bionic-text-dim">Posts</div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            {connStatus?.is_connected ? (
              <button onClick={() => router.push(`/chat/${profileId}`)} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> Message
              </button>
            ) : (
              <button onClick={handleConnect} disabled={connecting} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> {connecting ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Posts</h2>
          <div className="space-y-3">
            {postsData?.posts?.map((post) => (
              <div key={post.id} className="glass-card p-4 animate-fade-in">
                <p className="text-bionic-text">{post.content}</p>
                {post.image_url && <img src={post.image_url} alt="" className="mt-2 rounded-lg max-h-48 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                <div className="flex items-center gap-2 mt-3 text-xs text-bionic-text-dim">
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span>{post.impact_count} impacts</span>
                  <span>•</span>
                  <span>{formatRelativeTime(post.created_at)}</span>
                </div>
              </div>
            ))}
            {(!postsData?.posts || postsData.posts.length === 0) && (
              <p className="text-center text-bionic-text-dim py-4">No posts yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
