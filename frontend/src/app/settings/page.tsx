"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, Bell, Globe, Info, Shield } from "lucide-react";
import { useUser } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [notifications, setNotifications] = useState(true);
  const { lang, setLang, t } = useI18n();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="page-container mx-auto">
      <header className="section-gap">
        <div className="flex items-center gap-3">
          <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          <h1 className="heading-1">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto space-y-3 sm:space-y-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-bionic-text-dim mb-3">{t("settings.account")}</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-bionic-text text-sm sm:text-base truncate">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-bionic-text text-sm sm:text-base">@{user?.username}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-bionic-text-dim mb-3">Preferences</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
                <span className="text-sm sm:text-base">{t("settings.language")}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setLang("ru")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${lang === "ru" ? "bg-bionic-accent text-bionic-bg" : "bg-white/10 text-bionic-text-dim hover:bg-white/20"}`}>RU</button>
                <button onClick={() => setLang("en")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${lang === "en" ? "bg-bionic-accent text-bionic-bg" : "bg-white/10 text-bionic-text-dim hover:bg-white/20"}`}>EN</button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
                <span className="text-sm sm:text-base">{t("settings.notifications")}</span>
              </div>
              <button onClick={() => setNotifications(!notifications)} className={`w-10 h-6 rounded-full transition-colors ${notifications ? "bg-bionic-accent" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${notifications ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-bionic-text-dim mb-3">{t("settings.about")}</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
                <span className="text-sm sm:text-base">{t("settings.version")}</span>
              </div>
              <span className="text-bionic-text-dim text-sm sm:text-base">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-bionic-text-dim flex-shrink-0" />
                <span className="text-sm sm:text-base">{t("settings.privacy")}</span>
              </div>
              <span className="text-bionic-text-dim text-sm sm:text-base">—</span>
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full glass-card p-4 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm sm:text-base">{t("settings.logout")}</span>
        </button>
      </div>

    </div>
  );
}
