import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, session, loading: false, initialized: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });
  },

  signUp: async (email, password, name) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) return 'E-mail inválido';
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
    if (!trimmedName) return 'Nome é obrigatório';

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { name: trimmedName } },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) return 'E-mail já cadastrado';
      return 'Erro ao criar conta. Tente novamente';
    }

    // Immediately hydrate state if email confirmation is disabled
    if (data.user && data.session) {
      set({ user: data.user, session: data.session });
    }
    return null;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return 'E-mail ou senha inválidos';

    // Immediately hydrate state (onAuthStateChange also fires, but this is synchronous)
    if (data.user && data.session) {
      set({ user: data.user, session: data.session });
    }
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
