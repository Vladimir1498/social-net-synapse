"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, User, Bookmark, MessageSquare, Send } from "lucide-react";
import { Post } from "@/lib/types";
import { getTierInfo, formatRelativeTime, buildImageUrl } from "@/lib/utils";
import { useState } from "react";
import confetti from "canvas-confetti";
import { useSaveToKnowledge, useComments, useCreateComment, useSavePost, useUnsavePost } from "@/lib/hooks";

interface PostOverlayProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onImpact: (postId: string, feedback: string) => Promise<any>;
  onImpactSuccess?: (postId: string) => void;
}

export function PostOverlay({ post, isOpen, onClose, onImpact, onImpactSuccess }: PostOverlayProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImpactForm, setShowImpactForm] = useState(false);
  const [impactSuccess, setImpactSuccess] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saveToKnowledge, setSaveToKnowledge] = useState(false);

  const saveKnowledgeMutation = useSaveToKnowledge();
  const savePost = useSavePost();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { data: comments } = useComments(post?.id || "");
  const createComment = useCreateComment();

  const quickTags = ["Clear", "Helpful", "Innovative", "Inspiring", "Actionable"];

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (!post) return null;

  const handleImpact = async () => {
    if (feedback.length < 10 && selectedTags.length === 0) return;

    setIsSubmitting(true);
    setIsVerifying(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsVerifying(false);

    try {
      const fullFeedback = selectedTags.length > 0 ? `${selectedTags.join(", ")}. ${feedback}` : feedback;
      const result = await onImpact(post.id, fullFeedback);
      if (saveToKnowledge) {
        await saveKnowledgeMutation.mutateAsync({ postId: post.id });
      }

      setEarnedPoints((result as any)?.impact_points || 0);
      setImpactSuccess(true);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#06b6d4", "#10b981"],
      });

      setTimeout(() => {
        onImpactSuccess?.(post.id);
        onClose();
        setFeedback("");
        setShowImpactForm(false);
        setImpactSuccess(false);
        setEarnedPoints(0);
      }, 2500);
    } catch (error) {
      console.error("Impact error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal - Bottom sheet on mobile, centered on desktop */}
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative w-full md:max-w-2xl max-h-[85vh] md:max-h-[70vh] flex flex-col rounded-t-3xl md:rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle for mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-zinc-600" />
            </div>

            {/* Header - Sticky */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-zinc-900/90 backdrop-blur-sm rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{post.author_username}</p>
                    {post.author_impact_score !== undefined && (
                      <span className="text-lg" title={getTierInfo(post.author_impact_score).name}>
                        {getTierInfo(post.author_impact_score).icon}
                      </span>
                    )}
                    {post.author_impact_score !== undefined && post.author_impact_score > 100 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]" title="Verified Expert">
                        ★ Expert
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>{formatDate(post.created_at)}</span>
                    {post.author_is_focusing && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        🧘 {post.author_focus_goal || "Focusing"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <p className="text-base md:text-lg text-zinc-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.image_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                  <img src={buildImageUrl(post.image_url)} alt="Post image" className="w-full max-h-96 object-contain" />
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-6 pt-6 border-t border-white/10">
                {post.similarity_score != null && <div className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-sm">{post.similarity_score.toFixed(1)}% similar</div>}
                <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">{post.impact_count} impacts</div>
                <button onClick={() => setShowComments(!showComments)} className="px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-sm flex items-center gap-1 hover:bg-white/10 transition-colors">
                  <MessageSquare className="w-3 h-3" />
                  {comments?.length || 0}
                </button>
                <button onClick={() => savePost.mutate(post.id)} className="px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-sm flex items-center gap-1 hover:bg-white/10 transition-colors">
                  <Bookmark className="w-3 h-3" />
                  Save
                </button>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) {
                          createComment.mutate({ postId: post.id, content: commentText.trim() });
                          setCommentText("");
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                    <button
                      onClick={() => {
                        if (commentText.trim()) {
                          createComment.mutate({ postId: post.id, content: commentText.trim() });
                          setCommentText("");
                        }
                      }}
                      disabled={!commentText.trim()}
                      className="p-2 rounded-xl bg-violet-500/20 text-violet-400 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {comments?.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.author_username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{c.author_username}</span>
                          <span className="text-[10px] text-zinc-500">{formatRelativeTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 break-words">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments?.length === 0 && <p className="text-xs text-zinc-500 text-center py-2">No comments yet</p>}
                </div>
              )}
            </div>

            {/* Impact Section - Sticky at bottom */}
            {!impactSuccess ? (
              <div className="flex-shrink-0 p-4 md:p-6 pb-[120px] md:pb-6 border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm rounded-b-2xl space-y-3">
                {/* Join Focus Session button if author is focusing */}
                {post.author_is_focusing && (
                  <button className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500">
                    <span className="text-lg">🧘</span>
                    <span>Join Focus Session</span>
                  </button>
                )}
                {!showImpactForm ? (
                  <button onClick={() => setShowImpactForm(true)} disabled={post.is_impacted_by_me} className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${post.is_impacted_by_me ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"}`}>
                    <Zap className="w-5 h-5" />
                    <span>{post.is_impacted_by_me ? "Already Impacted" : "Give Impact"}</span>
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-400">How did this post help you?</label>

                    {/* Quick Tags */}
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map((tag) => (
                        <button key={tag} onClick={() => handleTagClick(tag)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedTags.includes(tag) ? "bg-violet-500/30 text-violet-300 border border-violet-400/50" : "bg-zinc-800/50 text-zinc-400 border border-white/10 hover:border-violet-500/30"}`}>
                          {tag}
                        </button>
                      ))}
                    </div>

                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share your feedback..." className="w-full h-20 px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-base" />

                    {/* Save to Knowledge Base */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={saveToKnowledge} onChange={() => setSaveToKnowledge(!saveToKnowledge)} className="w-4 h-4 rounded border-white/30 bg-white/10 text-violet-500 focus:ring-violet-500" />
                      <span className="text-sm text-zinc-400">Save to my Knowledge Base</span>
                    </label>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowImpactForm(false);
                          setSelectedTags([]);
                        }}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button onClick={handleImpact} disabled={(feedback.length < 10 && selectedTags.length === 0) || isSubmitting} className={`flex-1 py-3 rounded-xl font-semibold transition-all ${(feedback.length < 10 && selectedTags.length === 0) || isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"}`}>
                        {isVerifying ? "Verifying..." : isSubmitting ? "Sending..." : "Send Impact"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-shrink-0 p-6 pb-[120px] md:pb-6 text-center bg-zinc-900/90 backdrop-blur-sm rounded-b-2xl">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-xl font-semibold text-white">Impact Sent!</p>
                <p className="text-zinc-400 mt-1 text-sm">
                  {earnedPoints > 0 ? `+${earnedPoints} impact points awarded!` : "Feedback recorded (not constructive enough for points)"}
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
