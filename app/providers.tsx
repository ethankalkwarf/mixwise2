"use client";

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Session, createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// createClientComponentClient automatically picks up NEXT_PUBLIC_SUPABASE_URL 
// and NEXT_PUBLIC_SUPABASE_ANON_KEY from your environment.
const supabase = createClientComponentClient();

export function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}