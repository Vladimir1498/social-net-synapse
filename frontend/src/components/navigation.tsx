"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, User, Target, Search, MessageCircle, MoreHorizontal, Bookmark, Trophy, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

export function BottomNavigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-20 left-4 right-4 z-50">
            <div className="glass-card p-3 space-y-1">
              {moreItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setShowMore(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all", isActive ? "text-bionic-accent bg-bionic-accent/10" : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5")}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-2 sm:mx-4 mb-2 sm:mb-4">
          <div className="glass-card px-1 sm:px-2 py-2">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl transition-all duration-200", isActive ? "text-bionic-accent bg-bionic-accent/10" : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5")}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] sm:text-xs mt-1 font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <button onClick={() => setShowMore(!showMore)} className={cn("flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl transition-all duration-200", showMore ? "text-bionic-accent bg-bionic-accent/10" : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5")}>
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[10px] sm:text-xs mt-1 font-medium">More</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
