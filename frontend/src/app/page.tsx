"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target, Zap, Users, Clock, TrendingUp, Plus, X } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { PostOverlay } from "@/components/PostOverlay";
import { useUser, useUserStats, useSyncGoal, useFeed, useCreatePost, usePostImpact } from "@/lib/hooks";
import { formatRelativeTime, getSimilarityBadgeClass } from "@/lib/utils";
import { Post } from "@/lib/types";

export default function HubPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats } = useUserStats();
  const { data: feed } = useFeed(5);
  const syncGoal = useSyncGoal();
  const createPost = useCreatePost();
  const postImpact = usePostImpact();

  const [goalInput, setGoalInput] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !userLoading) {
      router.push("/social-net-synapse/login");
    }
  }, [userLoading, router]);

  const handleSyncGoal = () => {
    if (goalInput.trim()) {
      syncGoal.mutate({ goal: goalInput.trim() });
      setIsEditingGoal(false);
    }
  };

  const handleCreatePost = () => {
    console.log("handleCreatePost called", { postContent: postContent.trim() });
    if (postContent.trim()) {
      createPost.mutate(
        { content: postContent.trim() },
        {
          onSuccess: (data) => {
            console.log("Post created successfully:", data);
            setPostContent("");
            setShowPostModal(false);
          },
          onError: (error) => {
            console.error("Error creating post:", error);
          },
        },
      );
    }
  };

  const handleOpenPost = (post: Post) => {
    setSelectedPost(post);
    setShowOverlay(true);
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    setSelectedPost(null);
  };

  const handleImpact = async (postId: string, feedback: string) => {
    await postImpact.mutateAsync({ postId, feedback });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-bionic-text">
          Welcome back, <span className="text-bionic-accent">{user?.username || "Explorer"}</span>
        </h1>
        <p className="text-bionic-text-dim mt-1">Your synaptic journey continues</p>
      </header>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Current Goal Card */}
        <div className="bento-item-large animate-fade-in stagger-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-bionic-accent" />
              <h2 className="text-lg font-semibold">Current Goal</h2>
            </div>
            <button onClick={() => setIsEditingGoal(!isEditingGoal)} className="btn-ghost text-sm">
              {isEditingGoal ? "Cancel" : "Edit"}
            </button>
          </div>

          {isEditingGoal ? (
            <div className="space-y-3">
              <textarea value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="What are you working towards?" className="w-full h-24 px-4 py-3 rounded-xl glass-input text-bionic-text resize-none" />
              <button onClick={handleSyncGoal} disabled={syncGoal.isPending} className="btn-primary w-full">
                {syncGoal.isPending ? "Syncing..." : "Sync Goal"}
              </button>
            </div>
          ) : (
            <p className="text-bionic-text-dim text-lg">{user?.current_goal || "Set your goal to start matching with like-minded people"}</p>
          )}
        </div>

        {/* Impact Score Card */}
        <div className="bento-item animate-fade-in stagger-2">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-bionic-warning" />
            <h2 className="text-lg font-semibold">Impact Score</h2>
          </div>
          <div className="text-4xl font-bold text-bionic-text glow-text">{stats?.impact_score || 0}</div>
          <p className="text-bionic-text-dim text-sm mt-2">Points from constructive feedback</p>
        </div>

        {/* Stats Card */}
        <div className="bento-item animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-bionic-success" />
            <h2 className="text-lg font-semibold">Stats</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-bionic-text-dim">Connections</span>
              <span className="font-medium">{stats?.connections_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bionic-text-dim">Posts</span>
              <span className="font-medium">{stats?.posts_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bionic-text-dim">Focus Sessions</span>
              <span className="font-medium">{stats?.focus_sessions_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Focus Time Card */}
        <div className="bento-item animate-fade-in stagger-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-bionic-accent" />
            <h2 className="text-lg font-semibold">Focus Time</h2>
          </div>
          <div className="text-3xl font-bold text-bionic-text">
            {stats?.total_focus_minutes || 0}
            <span className="text-lg text-bionic-text-dim ml-1">min</span>
          </div>
          <p className="text-bionic-text-dim text-sm mt-2">Total productive time</p>
        </div>

        {/* Action Cards */}
        <div className="bento-item-full animate-fade-in stagger-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-bionic-accent" />
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="glass-button p-4 rounded-xl flex items-center gap-3 hover:border-bionic-accent/30">
              <div className="w-10 h-10 rounded-full bg-bionic-accent/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-bionic-accent" />
              </div>
              <div className="text-left">
                <div className="font-medium">Start Focus</div>
                <div className="text-sm text-bionic-text-dim">Begin a session</div>
              </div>
            </button>

            <button className="glass-button p-4 rounded-xl flex items-center gap-3 hover:border-bionic-accent/30">
              <div className="w-10 h-10 rounded-full bg-bionic-success/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-bionic-success" />
              </div>
              <div className="text-left">
                <div className="font-medium">Find Matches</div>
                <div className="text-sm text-bionic-text-dim">Discover people</div>
              </div>
            </button>

            <button
              onClick={() => {
                console.log("Create Post button clicked");
                setShowPostModal(true);
              }}
              className="glass-button p-4 rounded-xl flex items-center gap-3 hover:border-bionic-accent/30"
            >
              <div className="w-10 h-10 rounded-full bg-bionic-warning/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-bionic-warning" />
              </div>
              <div className="text-left">
                <div className="font-medium">Create Post</div>
                <div className="text-sm text-bionic-text-dim">Share your thoughts</div>
              </div>
            </button>
          </div>
        </div>

        {/* AI-Curated Feed Preview */}
        <div className="bento-item-full animate-fade-in stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Curated For You</h2>
            <span className="text-sm text-bionic-text-dim">Based on: {feed?.curated_by || "your interests"}</span>
          </div>
          <div className="space-y-3">
            {feed?.posts.slice(0, 3).map((post) => (
              <div key={post.id} onClick={() => handleOpenPost(post)} className="glass-button p-4 rounded-xl card-hover cursor-pointer relative group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-bionic-text line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-bionic-text-dim">@{post.author_username}</span>
                      <span className="text-sm text-bionic-text-dim">•</span>
                      <span className="text-sm text-bionic-text-dim">{formatRelativeTime(post.created_at)}</span>
                      {post.is_impacted_by_me && (
                        <>
                          <span className="text-sm text-bionic-text-dim">•</span>
                          <span className="text-sm text-bionic-success">⚡ Impacted</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.similarity_score !== undefined && <span className={getSimilarityBadgeClass(post.similarity_score)}>{post.similarity_score.toFixed(0)}%</span>}
                    {/* Quick Impact Button */}
                    {!post.is_impacted_by_me && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPost(post);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-violet-500/20 hover:bg-violet-500/30"
                        title="Give Impact"
                      >
                        <Zap className="w-4 h-4 text-violet-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!feed?.posts || feed.posts.length === 0) && <p className="text-bionic-text-dim text-center py-8">No posts yet. Set your goal to get personalized content.</p>}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bionic-bg/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Post</h2>
              <button onClick={() => setShowPostModal(false)} className="text-bionic-text-dim hover:text-bionic-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="Share your thoughts..." className="w-full h-32 px-4 py-3 rounded-xl glass-input text-bionic-text resize-none mb-4" />
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-bionic-text-dim">{postContent.length}/2000 characters</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setPostContent("");
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleCreatePost} disabled={!postContent.trim() || createPost.isPending} className="btn-primary flex-1">
                {createPost.isPending ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Overlay */}
      <PostOverlay post={selectedPost} isOpen={showOverlay} onClose={handleCloseOverlay} onImpact={handleImpact} />

      <BottomNavigation />
    </div>
  );
}
