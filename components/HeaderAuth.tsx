"use client";

import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useState } from 'react';

export function HeaderAuth() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [email, setEmail] = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    setEmail('');
    alert('Check your email for a login link to MixWise.');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>{user.email}</span>
        <button
          onClick={handleSignOut}
          className="px-3 py-1 rounded-full border border-slate-700 text-slate-200"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="flex items-center gap-2 text-xs">
      <input
        type="email"
        placeholder="Email to save your bar"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-slate-900 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lime-400"
      />
      <button
        type="submit"
        className="px-3 py-1 rounded-full bg-lime-500 text-slate-950 font-medium"
      >
        Sign in
      </button>
    </form>
  );
}