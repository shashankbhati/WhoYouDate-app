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

// Anonymous users: upgrades their account in place, preserving all data (same user_id)
// No session / new device: sends OTP to create/recover real account
export async function requestEmailLink(email: string) {
  if (_user && !_user.email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }
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
    return () => { listeners.delete(listener); };
  }, []);
  return {
    user: _user,
    loading: _loading,
    isReal: isRealUser(),
    modal: getModalState(),
  };
}
