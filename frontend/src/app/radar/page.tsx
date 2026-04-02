"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radar, MapPin, UserPlus, MessageSquare, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useUser, useMatches, useUpdateLocation, useGiveImpact, useConnect, useConnectionStatus } from "@/lib/hooks";
import { getSimilarityBadgeClass, getTierInfo } from "@/lib/utils";
import { MatchResult } from "@/lib/types";

function ConnectionButton({ userId, onConnect, isPending }: { userId: string; onConnect: () => void; isPending: boolean }) {
  const router = useRouter();
  const { data: connectionStatus } = useConnectionStatus(userId);
  const is_connected = connectionStatus?.is_connected ?? false;
  const is_pending_incoming = connectionStatus?.is_pending ?? false;
  const is_pending_outgoing = connectionStatus?.is_pending_outgoing ?? false;

  const handleClick = () => {
    if (is_connected) {
      router.push(`/chat/${userId}`);
    } else if (!is_pending_incoming && !is_pending_outgoing) {
      onConnect();
    }
  };

  return (
    <button onClick={handleClick} disabled={isPending || is_pending_incoming || is_pending_outgoing} className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-sm ${is_connected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" : is_pending_incoming ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : is_pending_outgoing ? "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30" : isPending ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"}`}>
      {is_connected ? (
        <>
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Message</span>
        </>
      ) : is_pending_incoming ? (
        <>
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="hidden sm:inline">Wants to connect</span>
        </>
      ) : is_pending_outgoing ? (
        <>
          <span className="w-4 h-4">⏳</span>
          <span className="hidden sm:inline">Request sent</span>
        </>
      ) : isPending ? (
        <>
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="hidden sm:inline">Sending...</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Connect
        </>
      )}
    </button>
  );
}

export default function RadarPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<MatchResult | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: matches, isLoading, error } = useMatches(2, 20);
  const updateLocation = useUpdateLocation();
  const giveImpact = useGiveImpact();
  const connect = useConnect();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !userLoading) {
      router.push("/login");
    }
  }, [userLoading, router]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lon: longitude });
          updateLocation.mutate({ latitude, longitude });
        },
        (error) => {
          console.error("Location error:", error);
        },
      );
    }
  }, []);

  const handleGiveImpact = () => {
    if (!selectedUser) return;
    const trimmedFeedback = feedbackText.trim();
    if (trimmedFeedback.length < 10) {
      setFeedbackError("Feedback must be at least 10 characters");
      return;
    }
    setFeedbackError("");
    giveImpact.mutate(
      { to_user_id: selectedUser.user.id, feedback_content: trimmedFeedback },
      {
        onSuccess: () => {
          setFeedbackText("");
          setSelectedUser(null);
          setShowSuccess(true);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#8b5cf6", "#06b6d4", "#10b981"] });
          setTimeout(() => setShowSuccess(false), 2000);
        },
      },
    );
  };

  const handleConnect = (match: MatchResult) => {
    connect.mutate({ to_user_id: match.user.id });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-container mx-auto">
      {/* Header */}
      <header className="section-gap">
        <div className="flex items-center gap-3">
          <Radar className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <div>
            <h1 className="heading-1">Radar</h1>
            <p className="text-sm text-bionic-text-dim">Discover people nearby</p>
          </div>
        </div>
      </header>

      {/* Location Status */}
      <div className="glass-card p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <MapPin className={`w-5 h-5 flex-shrink-0 ${location ? "text-bionic-success" : "text-bionic-text-dim"}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{location ? "Location Active" : "Location Required"}</p>
            <p className="text-xs text-bionic-text-dim truncate">{location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : "Enable location to find matches"}</p>
          </div>
        </div>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-bionic-text-dim">Scanning for matches...</div>
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <p className="text-bionic-danger">{error instanceof Error ? error.message : "Failed to load matches"}</p>
          <p className="text-bionic-text-dim text-sm mt-2">Make sure to set your goal and update your location</p>
        </div>
      ) : matches?.matches.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <Radar className="w-12 h-12 text-bionic-text-dim mx-auto mb-4" />
          <p className="text-bionic-text-dim">No matches found nearby</p>
          <p className="text-bionic-text-dim text-sm mt-2">Try expanding your search or updating your goal</p>
          <button onClick={() => router.push("/")} className="btn-primary mt-4">
            Update Your Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {matches?.matches.map((match, index) => (
            <motion.div key={match.user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-card p-3 sm:p-4 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-bionic-text">{match.user.username}</h3>
                    {match.user.is_focusing && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        Focusing
                      </span>
                    )}
                    <span className={getSimilarityBadgeClass(match.similarity_percentage)}>{match.similarity_percentage?.toFixed(0)}%</span>
                    {match.is_neighbor && <span className="badge-accent">Nearby</span>}
                    {match.similarity_percentage >= 90 && <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-400/50 text-violet-300 text-xs font-medium animate-pulse hidden sm:inline">🧠 Synaptic</span>}
                  </div>

                  {match.user.current_goal && <p className="text-sm text-bionic-text-dim mb-2 line-clamp-1">Goal: {match.user.current_goal}</p>}
                  {match.user.bio && <p className="text-sm text-bionic-text-dim line-clamp-2 hidden sm:block">{match.user.bio}</p>}

                  <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
                    <div className="flex items-center gap-1 text-sm text-bionic-text-dim">
                      <span title={`${getTierInfo(match.user.impact_score).name} Tier`}>{getTierInfo(match.user.impact_score).icon}</span>
                      <span>{match.user.impact_score} impact</span>
                    </div>
                    <div className="text-sm text-bionic-text-dim hidden sm:block">{match.h3_distance} cells away</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3 sm:mt-4">
                <button onClick={() => setSelectedUser(match)} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Quick Impact</span>
                </button>
                <ConnectionButton userId={match.user.id} onConnect={() => handleConnect(match)} isPending={connect.isPending} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Impact Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bionic-bg/80 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="glass-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl rounded-b-none p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Give Impact to {selectedUser.user.username}</h2>
                  <p className="text-bionic-text-dim text-sm">Quality feedback earns impact points!</p>
                </div>
              </div>

              <textarea
                value={feedbackText}
                onChange={(e) => { setFeedbackText(e.target.value); setFeedbackError(""); }}
                placeholder="Share your constructive feedback (min 10 characters)..."
                className="w-full h-28 sm:h-32 px-4 py-3 rounded-xl glass-input text-bionic-text resize-none mb-2"
              />
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-bionic-text-dim">{feedbackText.trim().length}/1000 characters</span>
                {feedbackError && <span className="text-xs text-bionic-danger">{feedbackError}</span>}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button onClick={() => { setSelectedUser(null); setFeedbackText(""); setFeedbackError(""); }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleGiveImpact} disabled={feedbackText.trim().length < 10 || giveImpact.isPending} className="flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Zap className="w-5 h-5" />
                  {giveImpact.isPending ? "Sending..." : "Send Impact"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: 50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 50, x: "-50%" }} className="fixed bottom-20 sm:bottom-24 left-1/2 z-50 px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold shadow-lg text-sm sm:text-base">
            Impact Sent!
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
