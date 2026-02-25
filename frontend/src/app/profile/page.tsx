"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, LogOut, Edit2, Save, Zap } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useUser, useUserStats } from "@/lib/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useUser();
  const { data: stats } = useUserStats();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !isLoading) {
      router.push("/login");
    }
  }, [isLoading, router]);

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setBio(user.bio || "");
    }
  }, [user]);

  const handleSave = () => {
    // TODO: Implement profile update
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  // Don't render user content if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-bionic-accent" />
            <h1 className="text-2xl font-bold text-bionic-text">Profile</h1>
          </div>
          <button onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-bionic-danger">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Profile Card */}
      <div className="max-w-lg mx-auto">
        <div className="glass-card p-6 animate-fade-in">
          {/* Avatar */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-bionic-accent/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-bionic-accent">{user?.username?.charAt(0).toUpperCase() || "U"}</span>
            </div>
          </div>

          {/* Edit Toggle */}
          <div className="flex justify-end mb-4">
            <button onClick={() => setIsEditing(!isEditing)} className="btn-ghost flex items-center gap-2">
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Edit
                </>
              )}
            </button>
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Username</label>
              {isEditing ? (
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl glass-input" />
              ) : (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-bionic-text-dim" />
                  <span className="text-lg">{user?.username}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-bionic-text-dim" />
                <span className="text-lg">{user?.email}</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Bio</label>
              {isEditing ? <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="w-full h-24 px-4 py-3 rounded-xl glass-input resize-none" /> : <p className="text-bionic-text-dim">{user?.bio || "No bio yet"}</p>}
            </div>

            {/* Current Goal */}
            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Current Goal</label>
              <p className="text-bionic-text">{user?.current_goal || "No goal set"}</p>
            </div>

            {/* Save Button */}
            {isEditing && (
              <button onClick={handleSave} className="btn-primary w-full">
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="glass-card p-6 mt-6 animate-fade-in stagger-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-bionic-warning" />
            Your Impact
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-bionic-accent">{stats?.impact_score || 0}</div>
              <div className="text-sm text-bionic-text-dim">Impact Score</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-bionic-text">{stats?.connections_count || 0}</div>
              <div className="text-sm text-bionic-text-dim">Connections</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-bionic-text">{stats?.posts_count || 0}</div>
              <div className="text-sm text-bionic-text-dim">Posts</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-bionic-text">{stats?.total_focus_minutes || 0}</div>
              <div className="text-sm text-bionic-text-dim">Focus Minutes</div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="glass-card p-6 mt-6 animate-fade-in stagger-3">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
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
