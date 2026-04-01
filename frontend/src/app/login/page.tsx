"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, User } from "lucide-react";
import { useLogin, useRegister } from "@/lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const login = useLogin();
  const register = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        if (!username.trim()) {
          setError("Username is required");
          return;
        }
        await register.mutateAsync({ email, password, username });
      } else {
        await login.mutateAsync({ email, password });
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-bionic-accent/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-bionic-accent" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bionic-text">Synapse</h1>
          <p className="text-bionic-text-dim mt-2 text-sm sm:text-base">Connect through purpose, not scrolling</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-5 sm:p-6 animate-fade-in stagger-1">
          <h2 className="text-lg sm:text-xl font-semibold mb-5 sm:mb-6 text-center">{isRegister ? "Create Account" : "Welcome Back"}</h2>

          {error && <div className="mb-4 p-3 rounded-xl bg-bionic-danger/10 border border-bionic-danger/30 text-bionic-danger text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-bionic-text-dim mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bionic-text-dim" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="johndoe" className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm sm:text-base" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bionic-text-dim" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm sm:text-base" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-bionic-text-dim mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bionic-text-dim" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm sm:text-base" required minLength={8} />
              </div>
            </div>

            <button type="submit" disabled={login.isPending || register.isPending} className="btn-primary w-full py-3">
              {login.isPending || register.isPending ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-bionic-text-dim hover:text-bionic-text transition-colors text-sm sm:text-base"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-3 sm:gap-4 text-center animate-fade-in stagger-2">
          <div className="glass-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl mb-1">🎯</div>
            <div className="text-[10px] sm:text-xs text-bionic-text-dim">Goal-driven</div>
          </div>
          <div className="glass-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl mb-1">📍</div>
            <div className="text-[10px] sm:text-xs text-bionic-text-dim">Proximity</div>
          </div>
          <div className="glass-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl mb-1">⚡</div>
            <div className="text-[10px] sm:text-xs text-bionic-text-dim">Impact</div>
          </div>
        </div>
      </div>
    </div>
  );
}
