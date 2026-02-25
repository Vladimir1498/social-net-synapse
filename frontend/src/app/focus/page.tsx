"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target, Clock, X, Play, Square } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useUser, useCurrentFocusSession, useStartFocusSession, useEndFocusSession } from "@/lib/hooks";
import { formatDuration } from "@/lib/utils";

export default function FocusPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const [goalInput, setGoalInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: currentSession, isLoading } = useCurrentFocusSession();
  const startSession = useStartFocusSession();
  const endSession = useEndFocusSession();

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !userLoading) {
      router.push("/login");
    }
  }, [userLoading, router]);

  // Update elapsed time
  useEffect(() => {
    if (currentSession?.is_active) {
      const interval = setInterval(() => {
        const start = new Date(currentSession.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000 / 60));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [currentSession]);

  const handleStartSession = () => {
    if (goalInput.trim()) {
      startSession.mutate({ goal: goalInput.trim() });
    }
  };

  const handleEndSession = () => {
    endSession.mutate();
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  // Active Focus Mode Overlay
  if (currentSession?.is_active) {
    return (
      <div className="focus-overlay">
        <div className="text-center max-w-md px-6 animate-fade-in">
          {/* Close button */}
          <button onClick={handleEndSession} disabled={endSession.isPending} className="absolute top-6 right-6 p-2 rounded-full glass-button">
            <X className="w-6 h-6" />
          </button>

          {/* Goal */}
          <div className="mb-8">
            <Target className="w-16 h-16 text-bionic-accent mx-auto mb-4 animate-pulse-glow" />
            <h1 className="text-2xl font-bold text-bionic-text mb-2">Focus Mode Active</h1>
            <p className="text-bionic-text-dim text-lg">{currentSession.goal}</p>
          </div>

          {/* Timer */}
          <div className="glass-card p-8 mb-8">
            <div className="text-6xl font-mono font-bold text-bionic-text glow-text">{formatDuration(elapsedTime)}</div>
            <p className="text-bionic-text-dim mt-2">elapsed</p>
          </div>

          {/* End Session Button */}
          <button onClick={handleEndSession} disabled={endSession.isPending} className="btn-primary w-full py-4 text-lg">
            <Square className="w-5 h-5 mr-2 inline" />
            {endSession.isPending ? "Ending..." : "End Session"}
          </button>
        </div>
      </div>
    );
  }

  // Start Focus Session View
  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-bionic-accent" />
          <div>
            <h1 className="text-2xl font-bold text-bionic-text">Focus Mode</h1>
            <p className="text-bionic-text-dim">Deep work, no distractions</p>
          </div>
        </div>
      </header>

      {/* Start Session Card */}
      <div className="max-w-lg mx-auto">
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="text-xl font-semibold mb-4">Start a Focus Session</h2>
          <p className="text-bionic-text-dim mb-6">Enter your goal for this session. Focus mode will block distractions and help you concentrate on what matters.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">What are you working on?</label>
              <textarea value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g., Complete the API integration for the matching service" className="w-full h-32 px-4 py-3 rounded-xl glass-input text-bionic-text resize-none" />
            </div>

            <button onClick={handleStartSession} disabled={!goalInput.trim() || startSession.isPending} className="btn-primary w-full py-4 text-lg">
              <Play className="w-5 h-5 mr-2 inline" />
              {startSession.isPending ? "Starting..." : "Start Focus Session"}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-bionic-text-dim">Tips for Focus</h3>
          <div className="glass-card p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-bionic-accent mt-0.5" />
              <div>
                <p className="font-medium">Work in blocks</p>
                <p className="text-sm text-bionic-text-dim">25-50 minute sessions are most effective</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-bionic-accent mt-0.5" />
              <div>
                <p className="font-medium">One goal at a time</p>
                <p className="text-sm text-bionic-text-dim">Focus on a single, specific objective</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
