import { useState, useEffect } from 'react';

import { supabase } from './supabase';

import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
};

let globalSession: Session | null = null;

let globalUser: User | null = null;

let globalLoading = true;

let globalError: string | null = null;

let authRevision = 0;

let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function setAuth(session: Session | null) {
  authRevision += 1;
  globalSession = session;

  globalUser = session?.user ?? null;

  globalLoading = false;
  globalError = null;

  notify();
}

export async function restoreAuthSession() {
  globalLoading = true;
  globalError = null;
  notify();

  const revision = authRevision;

  try {
    const { data, error } = await supabase.auth.getSession();

    if (revision !== authRevision) {
      return;
    }

    if (error) {
      throw error;
    }

    setAuth(data.session);
  } catch (error) {
    if (revision === authRevision) {
      globalError =
        error instanceof Error
          ? error.message
          : String(error);
      globalLoading = false;
      notify();
    }
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  setAuth(session);
});

void restoreAuthSession();

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
    error: globalError,
  };
}

export type SignUpProfile = {
  full_name: string;
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    ...(profile
      ? { options: { data: { full_name: profile.full_name } } }
      : {}),
  });

  if (!error && data.session && profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
      })
      .eq('id', data.session.user.id);

    if (profileError) {
      console.error('[signUp] Profile error:', profileError.message);
      return { data, error: profileError };
    }
  }

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  setAuth(null);

  return { error: null };
}