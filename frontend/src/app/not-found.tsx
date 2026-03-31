"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const prefixes = ["/chat/", "/profile/"];
    const isDynamic = prefixes.some((p) => pathname.startsWith(p) && pathname.length > p.length);

    if (isDynamic) {
      sessionStorage.setItem("redirect_path", pathname);
      router.replace("/");
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-bionic-text mb-2">404</h1>
        <p className="text-bionic-text-dim mb-4">Redirecting...</p>
      </div>
    </div>
  );
}
