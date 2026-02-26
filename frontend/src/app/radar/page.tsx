"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radar, MapPin, UserPlus, MessageSquare, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { BottomNavigation } from "@/components/navigation";
import { useUser, useMatches, useUpdateLocation, useGiveImpact, useConnect, useConnectionStatus } from "@/lib/hooks";
import { getSimilarityBadgeClass } from "@/lib/utils";
import { MatchResult } from "@/lib/types";

// Connection Button Component
function ConnectionButton({ userId, onConnect, isPending }: { userId: string; onConnect: () => void; isPending: boolean }) {
  const { data: connectionStatus } = useConnectionStatus(userId);
  const is_connected = connectionStatus?.is_connected ?? false;

  const handleClick = () => {
    if (is_connected) {
      // Show toast for coming soon
      alert("Chat feature coming soon! 💬");
    } else {
      onConnect();
    }
  };

  return (
    <button onClick={handleClick} disabled={isPending} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${is_connected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"}`}>
      {is_connected ? (
        <>
          <MessageSquare className="w-4 h-4" />
          Message
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          {isPending ? "Connecting..." : "Connect"}
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

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !userLoading) {
      router.push("/social-net-synapse/login");
    }
  }, [userLoading, router]);

  // Request location on mount
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
      {
        to_user_id: selectedUser.user.id,
        feedback_content: trimmedFeedback,
      },
      {
        onSuccess: (data) => {
          setFeedbackText("");
          setSelectedUser(null);
          setShowSuccess(true);

          // Trigger confetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#8b5cf6", "#06b6d4", "#10b981"],
          });

          setTimeout(() => setShowSuccess(false), 2000);
        },
      },
    );
  };

  const handleConnect = (match: MatchResult) => {
    console.log("handleConnect called", { match });
    connect.mutate(
      {
        to_user_id: match.user.id,
      },
      {
        onSuccess: (data) => {
          console.log("Connection successful:", data);
        },
        onError: (error) => {
          console.error("Connection error:", error);
        },
      },
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Radar className="w-8 h-8 text-bionic-accent" />
          <div>
            <h1 className="text-2xl font-bold text-bionic-text">Radar</h1>
            <p className="text-bionic-text-dim">Discover people nearby</p>
          </div>
        </div>
      </header>

      {/* Location Status */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3">
          <MapPin className={`w-5 h-5 ${location ? "text-bionic-success" : "text-bionic-text-dim"}`} />
          <div>
            <p className="text-sm font-medium">{location ? "Location Active" : "Location Required"}</p>
            <p className="text-xs text-bionic-text-dim">{location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : "Enable location to find matches"}</p>
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
        </div>
      ) : (
        <div className="space-y-4">
          {matches?.matches.map((match, index) => (
            <motion.div key={match.user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-card p-4 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-bionic-text">{match.user.username}</h3>
                    <span className={getSimilarityBadgeClass(match.similarity_percentage)}>{match.similarity_percentage.toFixed(0)}%</span>
                    {match.is_neighbor && <span className="badge-accent">Nearby</span>}
                  </div>

                  {match.user.current_goal && <p className="text-sm text-bionic-text-dim mb-2">Goal: {match.user.current_goal}</p>}

                  {match.user.bio && <p className="text-sm text-bionic-text-dim line-clamp-2">{match.user.bio}</p>}

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm text-bionic-text-dim">
                      <Zap className="w-4 h-4 text-bionic-warning" />
                      <span>{match.user.impact_score} impact</span>
                    </div>
                    <div className="text-sm text-bionic-text-dim">{match.h3_distance} cells away</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSelectedUser(match)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Quick Impact ⚡
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bionic-bg/80 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Give Impact to {selectedUser.user.username}</h2>
                  <p className="text-bionic-text-dim text-sm">Quality feedback earns impact points!</p>
                </div>
              </div>

              <textarea
                value={feedbackText}
                onChange={(e) => {
                  setFeedbackText(e.target.value);
                  setFeedbackError("");
                }}
                placeholder="Share your constructive feedback (min 10 characters)..."
                className="w-full h-32 px-4 py-3 rounded-xl glass-input text-bionic-text resize-none mb-2"
              />
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-bionic-text-dim">{feedbackText.trim().length}/1000 characters</span>
                {feedbackError && <span className="text-xs text-bionic-danger">{feedbackError}</span>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setFeedbackText("");
                    setFeedbackError("");
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button onClick={handleGiveImpact} disabled={feedbackText.trim().length < 10 || giveImpact.isPending} className="flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Zap className="w-5 h-5" />
                  {giveImpact.isPending ? "Sending..." : "Send Impact ⚡"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: 50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 50, x: "-50%" }} className="fixed bottom-24 left-1/2 z-50 px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold shadow-lg">
            🎉 Impact Sent!
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNavigation />
    </div>
  );
}
