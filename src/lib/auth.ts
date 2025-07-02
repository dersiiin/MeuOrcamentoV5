import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends User {
  profile?: {
    nome: string | null;
    avatar_url: string | null;
    moeda: string;
    tema: string;
  };
}

export class AuthService {
  static async signUp(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
        },
      },
    });

    if (error) throw error;

    // Criar perfil do usuário
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          nome,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Não lançar erro aqui para não bloquear o cadastro
      }
    }

    return data;
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Buscar perfil do usuário (opcional, não bloquear se falhar)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, avatar_url, moeda, tema')
          .eq('id', user.id)
          .single();

        return {
          ...user,
          profile: profile || undefined,
        };
      } catch (profileError) {
        // Se não conseguir buscar o perfil, retornar só o usuário
        return user as AuthUser;
      }
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }

  static async updateProfile(updates: {
    nome?: string;
    avatar_url?: string;
    moeda?: string;
    tema?: string;
    notificacoes_email?: boolean;
    notificacoes_push?: boolean;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
  }

  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // CORREÇÃO: Usando .then() para uma abordagem mais segura com o ciclo de vida do React.
        // A lógica é a mesma: buscar o perfil para garantir que o nome do usuário não suma.
        supabase
          .from('profiles')
          .select('nome, avatar_url, moeda, tema')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error('Error fetching profile on auth state change:', error);
              // Em caso de erro, retorna o usuário básico para não quebrar a sessão
              callback(session.user as AuthUser);
            } else {
              // Monta o objeto completo do usuário com os dados do perfil
              const fullUser: AuthUser = {
                ...session.user,
                profile: profile || undefined,
              };
              callback(fullUser);
            }
          });
      } else {
        // Se não houver sessão, envia null para o callback
        callback(null);
      }
    });
  }
}