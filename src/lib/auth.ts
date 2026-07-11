import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

let _user: User | null = null;
let _loading = true;
let _showModal = false;
let _modalMessage = "";

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const getAuthUser = () => _user;
// Real user = has an email (anonymous users have no email)
export const isRealUser = () => !!_user?.email;
export const getModalState = () => ({ open: _showModal, message: _modalMessage });

export function openAuthModal(message?: string) {
  _showModal = true;
  _modalMessage = message ?? "Sign in to continue.";
  emit();
}

export function closeAuthModal() {
  _showModal = false;
  emit();
}

if (typeof window !== "undefined") {
  supabase.auth.getUser().then(({ data }) => {
    _user = data.user;
    _loading = false;
    emit();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    _user = session?.user ?? null;
    _loading = false;
    emit();
  });
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Return to the exact page the user was on (e.g. a shared /p/:id link),
      // not the home page. Requires the Supabase redirect allowlist to include a
      // wildcard for the site (e.g. https://www.whoamidating.singles/**).
      redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
    },
  });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Set a new password for the logged-in user (email/password accounts). We never
// read or display a password — it's stored only as a one-way hash.
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  await supabase.auth.signInAnonymously();
}

export function useAuthState() {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return {
    user: _user,
    loading: _loading,
    isReal: isRealUser(),
    modal: getModalState(),
  };
}
