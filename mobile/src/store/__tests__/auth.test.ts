/**
 * Tests for the auth Zustand store (store/auth.ts).
 * Covers setAuth, clearAuth, and rehydrate actions.
 *
 * SecureStore is mocked to avoid native module access.
 * The store is reset between tests using setState to prevent state leakage.
 */

import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../auth';

// Covers auth.ts lines 21-25: setAuth calls SecureStore.setItemAsync
// Covers auth.ts lines 27-30: clearAuth calls SecureStore.deleteItemAsync
// Covers auth.ts lines 32-41: rehydrate reads SecureStore and updates state

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'auth_user_id';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store to initial state before each test
  useAuthStore.setState({ token: null, userId: null, isLoading: true });
});

// ── setAuth ───────────────────────────────────────────────────────────────────

describe('setAuth', () => {
  it('stores token and userId in Zustand state', async () => {
    // Covers auth.ts line 25: set({ token, userId })
    await useAuthStore.getState().setAuth('jwt-token-123', 'user-abc');
    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-token-123');
    expect(state.userId).toBe('user-abc');
  });

  it('calls SecureStore.setItemAsync with the token key and value', async () => {
    // Covers auth.ts line 22: SecureStore.setItemAsync(TOKEN_KEY, token)
    await useAuthStore.getState().setAuth('my-token', 'user-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'my-token');
  });

  it('calls SecureStore.setItemAsync with the userId key and value', async () => {
    // Covers auth.ts line 23: SecureStore.setItemAsync(USER_ID_KEY, userId)
    await useAuthStore.getState().setAuth('my-token', 'user-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(USER_ID_KEY, 'user-123');
  });
});

// ── clearAuth ─────────────────────────────────────────────────────────────────

describe('clearAuth', () => {
  it('sets token and userId to null in state', async () => {
    // Covers auth.ts line 30: set({ token: null, userId: null })
    await useAuthStore.getState().setAuth('existing-token', 'existing-user');
    expect(useAuthStore.getState().token).toBe('existing-token');

    await useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().userId).toBeNull();
  });

  it('calls SecureStore.deleteItemAsync with the token key', async () => {
    // Covers auth.ts line 28: SecureStore.deleteItemAsync(TOKEN_KEY)
    await useAuthStore.getState().clearAuth();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('calls SecureStore.deleteItemAsync with the userId key', async () => {
    // Covers auth.ts line 29: SecureStore.deleteItemAsync(USER_ID_KEY)
    await useAuthStore.getState().clearAuth();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(USER_ID_KEY);
  });
});

// ── rehydrate ─────────────────────────────────────────────────────────────────

describe('rehydrate', () => {
  it('sets isLoading to false after completion when store has no token', async () => {
    // Covers auth.ts line 37: set({ token, userId, isLoading: false }) on success
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().rehydrate();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('restores token from SecureStore when a value is persisted', async () => {
    // Covers auth.ts lines 34-37: token read from SecureStore and set in state
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('stored-token') // TOKEN_KEY read
      .mockResolvedValueOnce('stored-user-id'); // USER_ID_KEY read

    await useAuthStore.getState().rehydrate();
    expect(useAuthStore.getState().token).toBe('stored-token');
    expect(useAuthStore.getState().userId).toBe('stored-user-id');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('sets isLoading to false even when SecureStore throws', async () => {
    // Covers auth.ts lines 38-40: catch block sets isLoading: false
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('storage unavailable'));
    await useAuthStore.getState().rehydrate();
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
