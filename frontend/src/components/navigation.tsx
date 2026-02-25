"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, User, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Hub" },
  { href: "/radar", icon: Radar, label: "Radar" },
  { href: "/focus", icon: Target, label: "Focus" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-4 mb-4">
        <div className="glass-card px-2 py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200", isActive ? "text-bionic-accent bg-bionic-accent/10" : "text-bionic-text-dim hover:text-bionic-text hover:bg-white/5")}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
