import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export const getAuthToken = async (): Promise<string | null> => {
  return storage.getString(AUTH_TOKEN_KEY) || null;
};

export const setAuthToken = async (token: string): Promise<void> => {
  storage.set(AUTH_TOKEN_KEY, token);
};

export const removeAuthToken = async (): Promise<void> => {
  storage.delete(AUTH_TOKEN_KEY);
};

export const getUserData = async (): Promise<any | null> => {
  const userData = storage.getString(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

export const setUserData = async (user: any): Promise<void> => {
  storage.set(USER_DATA_KEY, JSON.stringify(user));
};

export const removeUserData = async (): Promise<void> => {
  storage.delete(USER_DATA_KEY);
};

export const clearAuth = async (): Promise<void> => {
  await removeAuthToken();
  await removeUserData();
};
