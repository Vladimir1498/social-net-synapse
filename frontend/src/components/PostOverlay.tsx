"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, User } from "lucide-react";
import { Post } from "@/lib/types";
import { useState } from "react";
import confetti from "canvas-confetti";

interface PostOverlayProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onImpact: (postId: string, feedback: string) => Promise<void>;
}

export function PostOverlay({ post, isOpen, onClose, onImpact }: PostOverlayProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImpactForm, setShowImpactForm] = useState(false);
  const [impactSuccess, setImpactSuccess] = useState(false);

  if (!post) return null;

  const handleImpact = async () => {
    if (feedback.length < 10) return;

    setIsSubmitting(true);
    try {
      await onImpact(post.id, feedback);
      setImpactSuccess(true);

      // Trigger confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#06b6d4", "#10b981"],
      });

      setTimeout(() => {
        onClose();
        setFeedback("");
        setShowImpactForm(false);
        setImpactSuccess(false);
      }, 2000);
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
                  <p className="font-semibold text-white">{post.author_username}</p>
                  <p className="text-sm text-zinc-400">{formatDate(post.created_at)}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <p className="text-base md:text-lg text-zinc-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-6 pt-6 border-t border-white/10">
                {post.similarity_score !== undefined && <div className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-sm">{post.similarity_score.toFixed(1)}% similar</div>}
                <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">{post.impact_count} impacts</div>
              </div>
            </div>

            {/* Impact Section - Sticky at bottom */}
            {!impactSuccess ? (
              <div className="flex-shrink-0 p-4 md:p-6 pb-[120px] md:pb-6 border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm rounded-b-2xl">
                {!showImpactForm ? (
                  <button onClick={() => setShowImpactForm(true)} disabled={post.is_impacted_by_me} className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${post.is_impacted_by_me ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"}`}>
                    <Zap className="w-5 h-5" />
                    <span>{post.is_impacted_by_me ? "Already Impacted" : "Give Impact"}</span>
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-400">How did this post help you? (min 10 chars)</label>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share your feedback..." className="w-full h-20 px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-base" />
                    <div className="flex gap-3">
                      <button onClick={() => setShowImpactForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleImpact} disabled={feedback.length < 10 || isSubmitting} className={`flex-1 py-3 rounded-xl font-semibold transition-all ${feedback.length < 10 || isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"}`}>
                        {isSubmitting ? "Sending..." : "Send Impact"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-shrink-0 p-6 pb-[120px] md:pb-6 text-center bg-zinc-900/90 backdrop-blur-sm rounded-b-2xl">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-xl font-semibold text-white">Impact Sent!</p>
                <p className="text-zinc-400 mt-1 text-sm">Your feedback made a difference.</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
