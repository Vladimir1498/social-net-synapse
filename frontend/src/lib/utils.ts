import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return past.toLocaleDateString();
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function getSimilarityBadgeClass(similarity: number): string {
  if (similarity >= 70) return "similarity-high";
  if (similarity >= 40) return "similarity-medium";
  return "similarity-low";
}

// Impact Tier system
export type ImpactTier = 'observer' | 'contributor' | 'catalyst' | 'synapse_node';

export interface TierInfo {
  name: string;
  icon: string;
  color: string;
}

export function getImpactTier(score: number): ImpactTier {
  if (score >= 200) return 'synapse_node';
  if (score >= 51) return 'catalyst';
  if (score >= 11) return 'contributor';
  return 'observer';
}

export function getTierInfo(score: number): TierInfo {
  const tier = getImpactTier(score);
  const tiers: Record<ImpactTier, TierInfo> = {
    observer: { name: 'Observer', icon: '👁️', color: 'text-gray-400' },
    contributor: { name: 'Contributor', icon: '🤝', color: 'text-green-400' },
    catalyst: { name: 'Catalyst', icon: '⚡', color: 'text-yellow-400' },
    synapse_node: { name: 'Synapse Node', icon: '🧠', color: 'text-purple-400' },
  };
  return tiers[tier];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function buildImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}
