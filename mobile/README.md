# NDE Panels Mobile App 📱

React Native mobile application for NDE Panels CRM field access, built with Expo and integrated with the existing backend API.

## Features

- **Authentication**: Secure login with token-based auth using MMKV storage
- **Jobs Management**: View and manage jobs from the field
- **Real-time Sync**: tRPC integration with existing backend
- **Offline Support**: Local storage with react-native-mmkv
- **Cross-platform**: iOS and Android support

## Tech Stack

- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **API Client**: tRPC React Query
- **Storage**: react-native-mmkv
- **UI**: React Native with custom dark theme

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── jobs.tsx       # Jobs list screen
│   │   ├── index.tsx      # Dashboard
│   │   └── explore.tsx    # Settings
│   ├── _layout.tsx        # Root layout with providers
│   └── login.tsx          # Login screen
├── lib/                   # Utilities
│   ├── trpc.ts           # tRPC client configuration
│   └── auth.ts           # Auth utilities
├── store/                # State management
│   └── authStore.ts      # Authentication store
└── components/           # Reusable components
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator

### Installation

1. Navigate to mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

### Running on Devices

**iOS Simulator** (Mac only):
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

**Physical Device**:
1. Install Expo Go app from App Store/Play Store
2. Scan QR code from terminal

## API Configuration

The app connects to your backend API:

- **Development**: `http://10.0.2.2:3000/api/trpc` (Android emulator)
- **Production**: `https://ndespanels.com/api/trpc`

Update API URL in `lib/trpc.ts` if needed.

## Authentication

Login credentials are the same as the web application. The app stores:
- Auth token in MMKV secure storage
- User data for offline access
- Auto-logout on token expiration

## Development

### Adding New Screens

Create new files in `app/` directory:
```typescript
// app/new-screen.tsx
export default function NewScreen() {
  return <View><Text>New Screen</Text></View>;
}
```

### Using tRPC

```typescript
import { trpc } from '@/lib/trpc';

export default function MyScreen() {
  const { data, isLoading } = trpc.crm.getLeads.useQuery();
  // ...
}
```

### State Management

```typescript
import { useAuthStore } from '@/store/authStore';

const user = useAuthStore((state) => state.user);
const logout = useAuthStore((state) => state.logout);
```

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## Environment Variables

Create `.env` file:
```
API_URL=https://ndespanels.com/api/trpc
```

## Troubleshooting

**Metro bundler issues**:
```bash
npx expo start --clear
```

**Android emulator can't connect**:
- Use `10.0.2.2` instead of `localhost`
- Check firewall settings

**iOS simulator issues**:
```bash
npx expo run:ios --clean
```

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [tRPC](https://trpc.io/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
