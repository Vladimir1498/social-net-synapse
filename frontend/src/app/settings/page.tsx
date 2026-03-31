"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, Trash2, Bell, Shield, Moon, Info } from "lucide-react";
import { BottomNavigation } from "@/components/navigation";
import { useUser } from "@/lib/hooks";

export default function SettingsPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-bionic-accent" />
          <h1 className="text-2xl font-bold text-bionic-text">Settings</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto space-y-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-bionic-text-dim mb-3">Account</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-bionic-text">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-bionic-text">@{user?.username}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-bionic-text-dim mb-3">Preferences</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-bionic-text-dim" />
                <span>Notifications</span>
              </div>
              <button onClick={() => setNotifications(!notifications)} className={`w-10 h-6 rounded-full transition-colors ${notifications ? "bg-bionic-accent" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${notifications ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-bionic-text-dim mb-3">About</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-bionic-text-dim" />
                <span>Version</span>
              </div>
              <span className="text-bionic-text-dim">0.1.0</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-bionic-text-dim" />
                <span>Privacy Policy</span>
              </div>
              <span className="text-bionic-text-dim">—</span>
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full glass-card p-4 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
