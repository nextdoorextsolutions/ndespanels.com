import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { trpc } from '@/lib/trpc';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: permissions, isLoading, error, refetch } = trpc.users.getMyPermissions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4aa" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>
          Unable to connect to NDES Panels backend
        </Text>
        <Text style={styles.errorDetails}>
          {error.message || 'Please check your connection'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButtonSecondary} onPress={handleLogout}>
          <Text style={styles.logoutButtonSecondaryText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MaterialIcons name="solar-power" size={32} color="#00d4aa" />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
        </View>

        <View style={styles.userInfoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={20} color="#94a3b8" />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color="#94a3b8" />
            <Text style={styles.infoText}>Role: {permissions?.roleDisplayName || user?.role || 'N/A'}</Text>
          </View>
          {user?.salesRepCode && (
            <View style={styles.infoRow}>
              <MaterialIcons name="code" size={20} color="#94a3b8" />
              <Text style={styles.infoText}>Rep Code: {user.salesRepCode}</Text>
            </View>
          )}
          {permissions && (
            <View style={styles.infoRow}>
              <MaterialIcons name="verified" size={20} color="#00d4aa" />
              <Text style={styles.infoTextSuccess}>Backend Connected</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <MaterialIcons name="check-circle" size={48} color="#00d4aa" />
          </View>
          <Text style={styles.statusTitle}>Connected to Backend</Text>
          <Text style={styles.statusSubtitle}>
            Successfully connected to NDES Panels CRM
          </Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBadgeText}>Live Connection</Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <MaterialIcons name="work" size={32} color="#00d4aa" />
            <Text style={styles.featureTitle}>Jobs</Text>
            <Text style={styles.featureSubtitle}>Coming Soon</Text>
          </View>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="map" size={32} color="#00d4aa" />
            <Text style={styles.featureTitle}>Field Map</Text>
            <Text style={styles.featureSubtitle}>Coming Soon</Text>
          </View>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="photo-camera" size={32} color="#00d4aa" />
            <Text style={styles.featureTitle}>Photos</Text>
            <Text style={styles.featureSubtitle}>Coming Soon</Text>
          </View>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="description" size={32} color="#00d4aa" />
            <Text style={styles.featureTitle}>Reports</Text>
            <Text style={styles.featureSubtitle}>Coming Soon</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  errorDetails: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#00d4aa',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonSecondary: {
    marginTop: 8,
  },
  logoutButtonSecondaryText: {
    color: '#ef4444',
    fontSize: 14,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userInfoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  infoTextSuccess: {
    color: '#00d4aa',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 24,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#00d4aa',
  },
  statusIconContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00d4aa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f172a',
  },
  statusBadgeText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featureSubtitle: {
    color: '#64748b',
    fontSize: 12,
  },
});
