import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/routers';
import { getAuthToken } from './auth';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api/trpc';
    }
    return 'http://localhost:3000/api/trpc';
  }
  return 'https://ndespanels.com/api/trpc';
};

export const trpc = createTRPCReact<AppRouter>();

export const getTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: getApiUrl(),
        async headers() {
          const token = await getAuthToken();
          return {
            authorization: token ? `Bearer ${token}` : '',
            'content-type': 'application/json',
          };
        },
      }),
    ],
  });
};
