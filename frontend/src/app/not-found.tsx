"use client";

import { Suspense, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

function NotFoundContent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    );
  }

  const chatMatch = pathname.match(/^\/chat\/(.+)$/);
  if (chatMatch) {
    const ChatClient = require("./chat/[userId]/ChatClient").default;
    return <ChatClient userId={chatMatch[1]} />;
  }

  const profileMatch = pathname.match(/^\/profile\/(.+)$/);
  if (profileMatch) {
    const ProfileClient = require("./profile/[profileId]/ProfileClient").default;
    return <ProfileClient profileId={profileMatch[1]} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-bionic-text mb-2">404</h1>
        <p className="text-bionic-text-dim mb-4">Page not found</p>
        <a href="/" className="text-bionic-accent hover:underline">
          Go to Home
        </a>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-bionic-text-dim">Loading...</div>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
}
