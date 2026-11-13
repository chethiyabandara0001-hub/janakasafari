'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Compass, LogIn } from 'lucide-react';

interface AdminLoginCardProps {
  loginEmail: string;
  loginPassword: string;
  loginError: string;
  loggingIn: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AdminLoginCard({
  loginEmail,
  loginPassword,
  loginError,
  loggingIn,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AdminLoginCardProps) {
  return (
    <div className="min-h-screen bg-[#090d0b] text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#101714] border border-emerald-950/90 rounded-lg p-7 space-y-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <Compass className="w-4 h-4" />
            <span>Nisha Safari CMS</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
            Admin Studio Sign In
          </h1>
          <p className="text-xs text-slate-400">
            Manage all 12 website pages, hero cross-section icons, and Cloudflare R2 media sync.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {loginError && (
            <div className="px-3 py-2.5 rounded-md bg-red-950/70 border border-red-800/80 text-xs text-red-300">
              {loginError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="block text-xs font-medium text-slate-300">
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={loginEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="nishasafari@gmail.com"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{loggingIn ? 'Signing in...' : 'Sign In to Studio'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">srilankabestsafari.com</span>
          <Link
            href="/index.html"
            className="inline-flex items-center gap-1 text-slate-300 hover:text-amber-400 transition-colors"
          >
            <span>Live Website</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
