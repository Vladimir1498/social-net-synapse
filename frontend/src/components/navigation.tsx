"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Radar, Search, Target, MessageCircle, MoreHorizontal, Bookmark, Trophy, Users, Settings, User, Plus, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUnreadCount } from "@/lib/hooks";

const navItems = [
  { href: "/", icon: Home, label: "Hub" },
  { href: "/radar", icon: Radar, label: "Radar" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/focus", icon: Target, label: "Focus" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
];

const moreItems = [
  { href: "/connections", icon: Users, label: "Connections" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unread_count || 0;

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 z-40 flex flex-col bg-zinc-900/80 backdrop-blur-xl border-r border-white/5">
      {/* Logo */}
      <div className="p-5 pb-2">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Synapse</span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                isActive
                  ? "text-white bg-white/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.href === "/chat" && unreadCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-violet-500 to-cyan-500" />
              )}
            </Link>
          );
        })}

        <div className="pt-2 border-t border-white/5 mt-2">
          {moreItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "text-white bg-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-violet-500 to-cyan-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unread_count || 0;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarNav />
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden">
        <AnimatePresence>
          {showMore && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setShowMore(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-[72px] left-3 right-3 z-50"
              >
                <div className="glass-card p-2 space-y-0.5">
                  {moreItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                          isActive
                            ? "text-bionic-accent bg-bionic-accent/10"
                            : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="mx-2 mb-2">
            <div className="glass-card px-1 py-1.5">
              <div className="flex items-center justify-around">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] relative",
                        isActive
                          ? "text-bionic-accent bg-bionic-accent/10"
                          : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                      {item.href === "/chat" && unreadCount > 0 && (
                        <span className="absolute top-0.5 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                          {unreadCount > 9 ? "9" : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
                <button
                  onClick={() => setShowMore(!showMore)}
                  className={cn(
                    "flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]",
                    showMore
                      ? "text-bionic-accent bg-bionic-accent/10"
                      : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5"
                  )}
                >
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 font-medium">More</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}


