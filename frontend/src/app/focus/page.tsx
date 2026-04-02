"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target, Clock, X, Play, Square, Sparkles } from "lucide-react";
import { useUser, useCurrentFocusSession, useStartFocusSession, useEndFocusSession } from "@/lib/hooks";
import { formatDuration } from "@/lib/utils";
import { api } from "@/lib/api";

export default function FocusPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const [goalInput, setGoalInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [aiSubtasks, setAiSubtasks] = useState<string[]>([]);
  const [completedSubtasks, setCompletedSubtasks] = useState<number[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [earnedImpact, setEarnedImpact] = useState(0);
  const [goalAchieved, setGoalAchieved] = useState<boolean | null>(null);

  const { data: currentSession, isLoading } = useCurrentFocusSession();
  const startSession = useStartFocusSession();
  const endSession = useEndFocusSession();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !userLoading) {
      router.push("/login");
    }
  }, [userLoading, router]);

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

  const handleStartSession = async () => {
    if (goalInput.trim()) {
      if (aiSubtasks.length === 0) {
        setIsLoadingAI(true);
        try {
          const response = await api.post("/ai/split-goal", { goal: goalInput.trim() });
          setAiSubtasks(response.data.subtasks || []);
        } catch (error) {
          console.error("Failed to get AI suggestions:", error);
        } finally {
          setIsLoadingAI(false);
        }
      }
      startSession.mutate({ goal: goalInput.trim() });
    }
  };

  const handleEndSession = () => {
    const impactEarned = Math.max(1, Math.floor(elapsedTime));
    setEarnedImpact(impactEarned);
    setShowSummary(true);

    endSession.mutate(undefined, {
      onSuccess: () => {
        setTimeout(() => {
          setShowSummary(false);
          setAiSubtasks([]);
          setCompletedSubtasks([]);
        }, 3000);
      },
    });
  };

  const handleSuggestSubtasks = async () => {
    if (!goalInput.trim()) return;
    setIsLoadingAI(true);
    try {
      const response = await api.post("/ai/split-goal", { goal: goalInput.trim() });
      setAiSubtasks(response.data.subtasks || []);
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
    } finally {
      setIsLoadingAI(false);
    }
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
  if (currentSession?.is_active || showSummary) {
    return (
      <div className="focus-overlay">
        <div className="text-center max-w-md px-4 sm:px-6 animate-fade-in">
          {showSummary ? (
            <div className="glass-card p-6 sm:p-8">
              <div className="text-5xl sm:text-6xl mb-4">🎉</div>
              <h2 className="text-xl sm:text-2xl font-bold text-bionic-text mb-2">Session Complete!</h2>
              <p className="text-bionic-text-dim mb-5 sm:mb-6">Great focus work today</p>

              {goalAchieved === null ? (
                <div className="mb-5 sm:mb-6">
                  <p className="text-sm text-bionic-text-dim mb-3">Did you achieve your goal?</p>
                  <div className="flex gap-3">
                    <button onClick={() => setGoalAchieved(true)} className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-sm">
                      ✓ Yes
                    </button>
                    <button onClick={() => setGoalAchieved(false)} className="flex-1 py-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-sm">
                      ✗ Not yet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-bionic-accent/20 rounded-xl p-4 mb-5 sm:mb-6">
                  <p className="text-sm text-bionic-text-dim">You earned</p>
                  <p className="text-3xl sm:text-4xl font-bold text-bionic-accent">+{earnedImpact} Impact</p>
                </div>
              )}

              <p className="text-sm text-bionic-text-dim">{completedSubtasks.length > 0 ? `${completedSubtasks.length}/${aiSubtasks.length} subtasks completed` : `You focused for ${formatDuration(elapsedTime)}`}</p>
            </div>
          ) : (
            <>
              <button onClick={handleEndSession} disabled={endSession.isPending} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 rounded-full glass-button">
                <X className="w-6 h-6" />
              </button>

              <div className="mb-6 sm:mb-8">
                <Target className="w-12 h-12 sm:w-16 sm:h-16 text-bionic-accent mx-auto mb-4 animate-pulse-glow" />
                <h1 className="text-xl sm:text-2xl font-bold text-bionic-text mb-2">Focus Mode Active</h1>
                <p className="text-bionic-text-dim text-base sm:text-lg">{currentSession?.goal}</p>
              </div>

              <div className="glass-card p-6 sm:p-8 mb-6 sm:mb-8">
                <div className="text-5xl sm:text-6xl font-mono font-bold text-bionic-text glow-text">{formatDuration(elapsedTime)}</div>
                <p className="text-bionic-text-dim mt-2">elapsed</p>
              </div>

              {aiSubtasks.length > 0 && (
                <div className="glass-card p-4 mb-6 sm:mb-8 text-left">
                  <h3 className="text-sm font-medium text-purple-300 mb-3">Sub-tasks</h3>
                  <div className="space-y-2">
                    {aiSubtasks.map((subtask, index) => (
                      <label key={index} className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={completedSubtasks.includes(index)}
                          onChange={() => {
                            if (completedSubtasks.includes(index)) {
                              setCompletedSubtasks(completedSubtasks.filter((i) => i !== index));
                            } else {
                              setCompletedSubtasks([...completedSubtasks, index]);
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded border-purple-500/50 bg-purple-500/20 text-purple-400 focus:ring-purple-500"
                        />
                        <span className={`text-sm ${completedSubtasks.includes(index) ? "text-bionic-text-dim line-through" : "text-bionic-text"}`}>{subtask}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-bionic-text-dim">
                    {completedSubtasks.length}/{aiSubtasks.length} completed
                  </div>
                </div>
              )}

              <button onClick={handleEndSession} disabled={endSession.isPending} className="btn-primary w-full py-4 text-base sm:text-lg">
                <Square className="w-5 h-5 mr-2 inline" />
                {endSession.isPending ? "Ending..." : "End Session"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Start Focus Session View
  return (
    <div className="page-container mx-auto">
      <header className="section-gap">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <div>
            <h1 className="heading-1">Focus Mode</h1>
            <p className="text-sm text-bionic-text-dim">Deep work, no distractions</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        <div className="glass-card p-4 sm:p-6 animate-fade-in">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Start a Focus Session</h2>
          <p className="text-bionic-text-dim mb-5 sm:mb-6 text-sm sm:text-base">Enter your goal for this session. Focus mode will block distractions and help you concentrate on what matters.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">What are you working on?</label>
              <textarea value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g., Complete the API integration for the matching service" className="w-full h-28 sm:h-32 px-4 py-3 rounded-xl glass-input text-bionic-text resize-none text-sm sm:text-base" />
            </div>

            <button onClick={handleSuggestSubtasks} disabled={!goalInput.trim() || isLoadingAI} className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50">
              <Sparkles className={`w-4 h-4 ${isLoadingAI ? "animate-spin" : ""}`} />
              {isLoadingAI ? "Analyzing..." : "Suggest Sub-tasks"}
            </button>

            {aiSubtasks.length > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-300 mb-2">Suggested Sub-tasks</h4>
                <ul className="space-y-1">
                  {aiSubtasks.map((subtask, index) => (
                    <li key={index} className="text-sm text-bionic-text-dim flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      {subtask}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={handleStartSession} disabled={!goalInput.trim() || startSession.isPending} className="btn-primary w-full py-4 text-base sm:text-lg">
              <Play className="w-5 h-5 mr-2 inline" />
              {startSession.isPending ? "Starting..." : "Start Focus Session"}
            </button>
          </div>
        </div>

        <div className="mt-5 sm:mt-6 space-y-3">
          <h3 className="text-sm font-medium text-bionic-text-dim">Tips for Focus</h3>
          <div className="glass-card p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-bionic-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Work in blocks</p>
                <p className="text-sm text-bionic-text-dim">25-50 minute sessions are most effective</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-bionic-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">One goal at a time</p>
                <p className="text-sm text-bionic-text-dim">Focus on a single, specific objective</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
