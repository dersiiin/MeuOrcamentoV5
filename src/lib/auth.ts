import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends User {
  profile?: {
    nome: string | null;
    avatar_url: string | null;
    moeda: string;
    tema: string;
    notificacoes_email: boolean;
    notificacoes_push: boolean;
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
    // Limpar localStorage antes do logout
    try {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (error) {
      console.warn('Error clearing storage:', error);
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Se houver erro de token, fazer logout automático
        if (error.message.includes('refresh_token_not_found') || 
            error.message.includes('Invalid Refresh Token')) {
          await this.clearAuthAndReload();
          return null;
        }
        throw error;
      }

      if (!user) {
        return null;
      }

      // Buscar perfil do usuário (opcional, não bloquear se falhar)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, avatar_url, moeda, tema, notificacoes_email, notificacoes_push')
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
      
      // Se for erro de token, limpar e recarregar
      if (error instanceof Error && 
          (error.message.includes('refresh_token_not_found') || 
           error.message.includes('Invalid Refresh Token'))) {
        await this.clearAuthAndReload();
      }
      
      return null;
    }
  }

  static async clearAuthAndReload() {
    try {
      // Limpar todos os dados de autenticação
      localStorage.clear();
      sessionStorage.clear();
      
      // Limpar cookies do Supabase
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });

      // Recarregar a página para reinicializar o estado
      window.location.reload();
    } catch (error) {
      console.error('Error clearing auth:', error);
      window.location.reload();
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

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    // Aplicar tema imediatamente se foi alterado
    if (updates.tema) {
      this.applyTheme(updates.tema);
    }
    
    return data;
  }

  static applyTheme(theme: string) {
    const root = document.documentElement;
    
    // Remove classes de tema existentes
    root.classList.remove('light', 'dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'auto') {
      // Detecta preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    }
  }

  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      // Se o evento for de erro de token, limpar e recarregar
      if (event === 'TOKEN_REFRESHED' && !session) {
        await this.clearAuthAndReload();
        return;
      }

      if (session?.user) {
        // Buscar o perfil para garantir que o tema seja aplicado
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('nome, avatar_url, moeda, tema, notificacoes_email, notificacoes_push')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching profile on auth state change:', error);
            callback(session.user as AuthUser);
          } else {
            // Aplicar tema se disponível
            if (profile?.tema) {
              this.applyTheme(profile.tema);
            }
            
            const fullUser: AuthUser = {
              ...session.user,
              profile: profile || undefined,
            };
            callback(fullUser);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          callback(session.user as AuthUser);
        }
      } else {
        callback(null);
      }
    });
  }
}