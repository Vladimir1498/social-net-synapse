"use client";

import { motion } from "framer-motion";

export function PostSkeleton() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-full bg-white/10" />

        <div className="flex-1">
          {/* Username skeleton */}
          <div className="h-4 w-24 bg-white/10 rounded mb-2" />

          {/* Content skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-3/4 bg-white/5 rounded" />
          </div>

          {/* Footer skeleton */}
          <div className="flex items-center gap-4 mt-3">
            <div className="h-3 w-16 bg-white/5 rounded" />
            <div className="h-3 w-20 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchSkeleton() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header skeleton */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-24 bg-white/10 rounded" />
            <div className="h-5 w-12 bg-white/10 rounded" />
          </div>

          {/* Goal skeleton */}
          <div className="h-3 w-48 bg-white/5 rounded mb-2" />

          {/* Bio skeleton */}
          <div className="h-3 w-full bg-white/5 rounded mb-2" />
          <div className="h-3 w-2/3 bg-white/5 rounded" />

          {/* Stats skeleton */}
          <div className="flex items-center gap-4 mt-3">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-3 w-24 bg-white/5 rounded" />
          </div>
        </div>
      </div>

      {/* Buttons skeleton */}
      <div className="flex gap-2 mt-4">
        <div className="h-10 flex-1 bg-white/10 rounded-xl" />
        <div className="h-10 w-20 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}

export function SkillBarSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white/5 rounded-full w-1/2 animate-pulse" />
      </div>
      <div className="h-3 w-16 bg-white/10 rounded" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="text-center p-4 rounded-xl bg-white/5 animate-pulse">
      <div className="h-8 w-12 bg-white/10 rounded mx-auto mb-2" />
      <div className="h-3 w-20 bg-white/10 rounded mx-auto" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-white/10 mx-auto mb-4" />
        <div className="h-6 w-32 bg-white/10 rounded mx-auto mb-2" />
        <div className="h-4 w-48 bg-white/5 rounded mx-auto" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Skill map skeleton */}
      <div className="p-4 rounded-xl bg-white/5">
        <div className="h-4 w-24 bg-white/10 rounded mb-3" />
        <div className="space-y-2">
          <SkillBarSkeleton />
          <SkillBarSkeleton />
          <SkillBarSkeleton />
          <SkillBarSkeleton />
        </div>
      </div>
    </div>
  );
}
