import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'auth_user_id';

interface AuthState {
  token: string | null;
  userId: string | null;
  isLoading: boolean;
  setAuth: (token: string, userId: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  isLoading: true,

  setAuth: async (token, userId) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
    set({ token, userId });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    set({ token: null, userId: null });
  },

  rehydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      set({ token, userId, isLoading: false });
    } catch {
      set({ token: null, userId: null, isLoading: false });
    }
  },
}));
