"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target, Zap, Users, Clock, TrendingUp, Plus, X, Sparkles, Bell, Camera, Upload } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { PostOverlay } from "@/components/PostOverlay";
import { useUser, useUserStats, useSyncGoal, useFeed, useCreatePost, usePostImpact, useFocusStreak, useLiveFocusing, useSuggestedPosts, useNotifications, useUploadAvatar, useUploadImage } from "@/lib/hooks";
import { formatRelativeTime, getSimilarityBadgeClass, getTierInfo, buildImageUrl } from "@/lib/utils";
import { Post } from "@/lib/types";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function HubPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats } = useUserStats();
  const { data: streak } = useFocusStreak();
  const { data: liveFocusing } = useLiveFocusing();
  const { data: feed } = useFeed(5);
  const syncGoal = useSyncGoal();
  const createPost = useCreatePost();
  const postImpact = usePostImpact();
  const { data: notifications } = useNotifications(20, true);
  const uploadAvatar = useUploadAvatar();
  const uploadImage = useUploadImage();

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const [goalInput, setGoalInput] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [dailyDiscovery, setDailyDiscovery] = useState<{ posts: Post[]; insights: string[] } | null>(null);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [impactedPostId, setImpactedPostId] = useState<string | null>(null);
  const [showSuggestedPosts, setShowSuggestedPosts] = useState(false);

  // Suggested posts after giving impact
  const excludeIds = impactedPostId ? [impactedPostId] : [];
  const { data: suggestedPosts } = useSuggestedPosts(5, excludeIds);

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !userLoading) {
      router.push("/login");
    }
  }, [userLoading, router]);

  // Force goal modal if user has no goal
  useEffect(() => {
    if (user && !user.current_goal && !isEditingGoal) {
      setIsEditingGoal(true);
    }
  }, [user, isEditingGoal]);

  const handleSyncGoal = () => {
    if (goalInput.trim()) {
      syncGoal.mutate({ goal: goalInput.trim() });
      setIsEditingGoal(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    let imageUrl = postImageUrl.trim();
    if (postImageFile) {
      const result = await uploadImage.mutateAsync(postImageFile);
      imageUrl = result.url;
    }
    createPost.mutate(
      { content: postContent.trim(), image_url: imageUrl || undefined },
      {
        onSuccess: () => {
          setPostContent("");
          setPostImageUrl("");
          setPostImageFile(null);
          setPostImagePreview("");
          setShowPostModal(false);
        },
        onError: (error) => {
          console.error("Error creating post:", error);
        },
      },
    );
  };

  const loadDailyDiscovery = async () => {
    setIsLoadingDiscovery(true);
    try {
      const response = await api.get("/ai/daily-discovery");
      setDailyDiscovery(response.data);
    } catch (error) {
      console.error("Failed to load daily discovery:", error);
    } finally {
      setIsLoadingDiscovery(false);
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
    const result = await postImpact.mutateAsync({ postId, feedback });
    return result;
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
      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-8 text-center max-w-md mx-4">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: 3, duration: 0.5 }} className="text-6xl mb-4">
                ⬆️
              </motion.div>
              <h2 className="text-3xl font-bold text-bionic-accent mb-2">Level Up!</h2>
              <p className="text-bionic-text-dim">You've reached a new tier!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-bionic-text">
              Welcome back, <span className="text-bionic-accent">{user?.username || "Explorer"}</span>
            </h1>
            <div className="flex items-center gap-2">
            {user?.impact_score !== undefined && (
              <span className="text-2xl" title={`${getTierInfo(user.impact_score).name} Tier`}>
                {getTierInfo(user.impact_score).icon}
              </span>
            )}
            <button onClick={() => router.push("/connections")} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5 text-bionic-text-dim" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          </div>
          </div>

          {/* Focus Streak */}
          {streak && streak.current_streak > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-medium text-orange-400">
                {streak.current_streak} day{streak.current_streak > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Live Focusing */}
          {liveFocusing && liveFocusing.count > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 animate-pulse">
              <span className="text-lg">🧘</span>
              <span className="text-sm font-medium text-indigo-400">{liveFocusing.count} focusing</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-bionic-text-dim">Your synaptic journey continues</p>
          {user?.is_focusing && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Focusing
            </span>
          )}
        </div>
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

        {/* Daily Discovery Card */}
        <div className="bento-item-full animate-fade-in stagger-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold">Daily Discovery</h2>
            </div>
            <button onClick={loadDailyDiscovery} disabled={isLoadingDiscovery} className="text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50">
              {isLoadingDiscovery ? "Loading..." : "Refresh"}
            </button>
          </div>
          {dailyDiscovery ? (
            <div className="space-y-3">
              {dailyDiscovery.posts?.slice(0, 3).map((post: Post) => (
                <button key={post.id} onClick={() => handleOpenPost(post)} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <p className="text-sm text-bionic-text line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-bionic-text-dim">@{post.author_username}</span>
                    {post.author_impact_score !== undefined && post.author_impact_score > 100 && <span className="text-amber-400 text-xs">★ Expert</span>}
                  </div>
                </button>
              ))}
              {dailyDiscovery.insights?.length > 0 && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <h4 className="text-xs font-medium text-purple-300 mb-1">AI Insights</h4>
                  <p className="text-sm text-bionic-text-dim">{dailyDiscovery.insights[0]}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-bionic-text-dim">Click Refresh to discover trending content from experts</p>
          )}
        </div>

        {/* Action Cards */}
        <div className="bento-item-full animate-fade-in stagger-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-bionic-accent" />
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => router.push("/focus")} className="glass-button p-4 rounded-xl flex items-center gap-3 hover:border-bionic-accent/30">
              <div className="w-10 h-10 rounded-full bg-bionic-accent/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-bionic-accent" />
              </div>
              <div className="text-left">
                <div className="font-medium">Start Focus</div>
                <div className="text-sm text-bionic-text-dim">Begin a session</div>
              </div>
            </button>

            <button onClick={() => router.push("/radar")} className="glass-button p-4 rounded-xl flex items-center gap-3 hover:border-bionic-accent/30">
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
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Curated For You</h2>
            <span className="text-xs sm:text-sm text-bionic-text-dim truncate ml-2">Based on: {feed?.curated_by || "your interests"}</span>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {feed?.posts.slice(0, 3).map((post) => (
              <div key={post.id} onClick={() => handleOpenPost(post)} className="glass-button p-3 sm:p-4 rounded-xl card-hover cursor-pointer relative group">
                <div className="flex items-start gap-2 sm:gap-3">
                  {post.author_avatar_url ? (
                    <img src={buildImageUrl(post.author_avatar_url)} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">{post.author_username?.[0]?.toUpperCase() || "?"}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-medium truncate">@{post.author_username}</span>
                      {post.author_impact_score != null && (
                        <span className="text-sm sm:text-lg flex-shrink-0" title={`${getTierInfo(post.author_impact_score).name}`}>{getTierInfo(post.author_impact_score).icon}</span>
                      )}
                      <span className="text-xs text-bionic-text-dim flex-shrink-0">{formatRelativeTime(post.created_at)}</span>
                    </div>
                    <p className="text-sm sm:text-base text-bionic-text line-clamp-2">{post.content}</p>
                    {post.image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                        <img src={buildImageUrl(post.image_url)} alt="" className="w-full max-h-40 sm:max-h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs sm:text-sm text-bionic-text-dim flex items-center gap-1"><Zap className="w-3 h-3 text-violet-400" />{post.impact_count}</span>
                      {post.is_impacted_by_me && <span className="text-xs text-bionic-success">⚡ Impacted</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {post.similarity_score != null && <span className={`${getSimilarityBadgeClass(post.similarity_score)} text-xs`}>{post.similarity_score.toFixed(0)}%</span>}
                    {!post.is_impacted_by_me && (
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPost(post); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30" title="Give Impact">
                        <Zap className="w-3.5 h-3.5 text-violet-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(!feed?.posts || feed.posts.length === 0) && (
              <div className="text-center py-8">
                <p className="text-bionic-text-dim">No posts yet. Set your goal to get personalized content.</p>
                <button onClick={() => setIsEditingGoal(true)} className="btn-primary mt-4">
                  Set Your Goal
                </button>
              </div>
            )}
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
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPostImageFile(file);
                        setPostImageUrl("");
                        const reader = new FileReader();
                        reader.onload = (ev) => setPostImagePreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 hover:border-bionic-accent/50 transition-colors text-sm text-bionic-text-dim">
                    <Upload className="w-4 h-4" />
                    {postImageFile ? postImageFile.name : "Choose from device"}
                  </div>
                </label>
                <input
                  type="url"
                  value={postImageUrl}
                  onChange={(e) => {
                    setPostImageUrl(e.target.value);
                    setPostImageFile(null);
                    setPostImagePreview(e.target.value);
                  }}
                  placeholder="Or paste URL"
                  className="flex-1 px-4 py-2 rounded-xl glass-input text-bionic-text text-sm"
                />
              </div>
              {postImagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={postImagePreview} alt="Preview" className="w-full max-h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <button onClick={() => { setPostImageFile(null); setPostImagePreview(""); setPostImageUrl(""); }} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-bionic-text-dim">{postContent.length}/2000 characters</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setPostContent("");
                  setPostImageUrl("");
                  setPostImageFile(null);
                  setPostImagePreview("");
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
      <PostOverlay
        post={selectedPost}
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        onImpact={handleImpact}
        onImpactSuccess={(postId) => {
          setImpactedPostId(postId);
          setShowSuggestedPosts(true);
        }}
      />

      {/* Suggested Posts After Impact */}
      <AnimatePresence>
        {showSuggestedPosts && suggestedPosts?.posts && suggestedPosts.posts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-40 bg-bionic-bg/95 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Keep the momentum! 🔥</h2>
                <button onClick={() => setShowSuggestedPosts(false)} className="text-bionic-text-dim hover:text-bionic-text">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-bionic-text-dim mb-4">More posts you might like:</p>
              <div className="space-y-4">
                {suggestedPosts.posts.map((post) => (
                  <div key={post.id} className="glass-card p-4 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">{post.author_username?.[0]?.toUpperCase() || "?"}</div>
                      <span className="font-medium">{post.author_username}</span>
                    </div>
                    <p className="text-bionic-text-dim text-sm mb-2">{post.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-bionic-text-dim text-sm">
                        <Zap className="w-4 h-4 text-violet-400" />
                        <span>{post.impact_count} impacts</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPost(post);
                          setShowOverlay(true);
                        }}
                        className="text-violet-400 text-sm hover:text-violet-300"
                      >
                        View →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowSuggestedPosts(false)} className="w-full mt-6 py-3 rounded-xl bg-zinc-800 text-zinc-400">
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNavigation />
    </div>
  );
}
