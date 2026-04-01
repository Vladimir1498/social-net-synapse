"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, LogOut, Edit2, Save, Zap, TrendingUp, Camera } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useUser, useUserStats, useSkillMap, useImpactHistory, useUpdateProfile, useUploadAvatar } from "@/lib/hooks";
import { formatRelativeTime, buildImageUrl } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useUser();
  const { data: stats } = useUserStats();
  const { data: skillMap } = useSkillMap();
  const { data: impactHistory } = useImpactHistory(10);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !isLoading) {
      router.push("/login");
    }
  }, [isLoading, router]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setBio(user.bio || "");
    }
  }, [user]);

  const handleSave = () => {
    updateProfile.mutate(
      { username: username !== user?.username ? username : undefined, bio: bio || undefined },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
            <h1 className="heading-1">Profile</h1>
          </div>
          <button onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-red-400/70 hover:text-red-400 text-sm">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Profile Card */}
      <div className="max-w-lg mx-auto">
        <div className="glass-card p-4 sm:p-6 animate-fade-in">
          {/* Avatar */}
          <div className="flex items-center justify-center mb-5 sm:mb-6">
            <label className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-bionic-accent/20 flex items-center justify-center cursor-pointer group overflow-hidden">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar.mutate(file);
                }}
              />
              {user?.avatar_url ? (
                <img src={buildImageUrl(user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl sm:text-4xl font-bold text-bionic-accent">{user?.username?.charAt(0).toUpperCase() || "U"}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </label>
          </div>

          {/* Edit Toggle */}
          <div className="flex justify-end mb-4">
            <button onClick={() => setIsEditing(!isEditing)} className="btn-ghost flex items-center gap-2 text-sm">
              {isEditing ? (
                <><Save className="w-4 h-4" /> Cancel</>
              ) : (
                <><Edit2 className="w-4 h-4" /> Edit</>
              )}
            </button>
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Username</label>
              {isEditing ? (
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl glass-input text-sm sm:text-base" />
              ) : (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
                  <span className="text-base sm:text-lg">{user?.username}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
                <span className="text-sm sm:text-lg truncate">{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Bio</label>
              {isEditing ? <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="w-full h-20 sm:h-24 px-4 py-3 rounded-xl glass-input resize-none text-sm sm:text-base" /> : <p className="text-bionic-text-dim text-sm sm:text-base">{user?.bio || "No bio yet"}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Current Goal</label>
              <p className="text-bionic-text text-sm sm:text-base">{user?.current_goal || "No goal set"}</p>
            </div>

            {isEditing && (
              <button onClick={handleSave} className="btn-primary w-full">
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="glass-card p-4 sm:p-6 mt-5 sm:mt-6 animate-fade-in stagger-2">
          <h2 className="heading-2 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-bionic-warning" />
            Your Impact
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 rounded-xl bg-white/5">
              <div className="text-2xl sm:text-3xl font-bold text-bionic-accent">{stats?.impact_score || 0}</div>
              <div className="text-xs sm:text-sm text-bionic-text-dim">Impact Score</div>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-xl bg-white/5">
              <div className="text-2xl sm:text-3xl font-bold text-bionic-text">{stats?.connections_count || 0}</div>
              <div className="text-xs sm:text-sm text-bionic-text-dim">Connections</div>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-xl bg-white/5">
              <div className="text-2xl sm:text-3xl font-bold text-bionic-text">{stats?.posts_count || 0}</div>
              <div className="text-xs sm:text-sm text-bionic-text-dim">Posts</div>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-xl bg-white/5">
              <div className="text-2xl sm:text-3xl font-bold text-bionic-text">{stats?.total_focus_minutes || 0}</div>
              <div className="text-xs sm:text-sm text-bionic-text-dim">Focus Minutes</div>
            </div>
          </div>

          {/* Growth Graph */}
          <div className="mt-5 sm:mt-6 p-3 sm:p-4 rounded-xl bg-white/5">
            <h3 className="text-sm font-medium text-bionic-text-dim mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Growth Trajectory
            </h3>
            <div className="h-20 sm:h-24 flex items-end justify-between gap-1">
              {[
                { label: "W1", value: Math.min((stats?.impact_score || 10) * 0.3, 30) },
                { label: "W2", value: Math.min((stats?.impact_score || 15) * 0.5, 50) },
                { label: "W3", value: Math.min((stats?.impact_score || 20) * 0.7, 70) },
                { label: "W4", value: Math.min((stats?.impact_score || 30) * 0.9, 90) },
                { label: "Now", value: Math.min(stats?.impact_score || 40, 100) },
              ].map((point, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gradient-to-t from-bionic-accent/50 to-bionic-accent rounded-t" style={{ height: `${point.value}%` }} />
                  <span className="text-[10px] sm:text-xs text-bionic-text-dim mt-1">{point.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-bionic-text-dim text-center">Keep focusing and connecting to grow your impact!</div>
          </div>

          {/* Skill Map */}
          {skillMap && skillMap.skills.length > 0 && (
            <div className="mt-5 sm:mt-6 p-3 sm:p-4 rounded-xl bg-white/5">
              <h3 className="text-sm font-medium text-bionic-text-dim mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Skill Map
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {skillMap.skills.slice(0, 6).map((skill, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width: `${skill.score}%` }} />
                    </div>
                    <span className="text-xs text-bionic-text-dim w-16 sm:w-20 truncate">{skill.skill}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs text-bionic-text-dim">
                <span>Focus: {skillMap.focus_minutes} min</span>
                <span>Streak: {skillMap.streak_days} days</span>
              </div>
            </div>
          )}

          {/* Impact History */}
          {impactHistory && (impactHistory.given.length > 0 || impactHistory.received.length > 0) && (
            <div className="mt-5 sm:mt-6 p-3 sm:p-4 rounded-xl bg-white/5">
              <h3 className="text-sm font-medium text-bionic-text-dim mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Impact History
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {impactHistory.received.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 flex-shrink-0">↓</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-bionic-text">{entry.source_username}</span>
                      <span className="text-bionic-text-dim">
                        : {entry.feedback_content.slice(0, 50)}
                        {entry.feedback_content.length > 50 ? "..." : ""}
                      </span>
                    </div>
                    {entry.is_constructive && <span className="text-violet-400 flex-shrink-0">+{entry.impact_points}</span>}
                  </div>
                ))}
                {impactHistory.given.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-400 flex-shrink-0">↑</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-bionic-text">{entry.target_username}</span>
                      <span className="text-bionic-text-dim">
                        : {entry.feedback_content.slice(0, 50)}
                        {entry.feedback_content.length > 50 ? "..." : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="glass-card p-4 sm:p-6 mt-5 sm:mt-6 animate-fade-in stagger-3">
          <h2 className="heading-2 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-bionic-text-dim">Member since</span>
              <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bionic-text-dim">Location</span>
              <span>Not shared</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
