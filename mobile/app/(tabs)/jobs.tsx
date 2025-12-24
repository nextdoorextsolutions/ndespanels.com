import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';

export default function JobsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: jobs, isLoading, refetch, isRefetching } = trpc.crm.getLeads.useQuery({
    status: undefined,
    assignedTo: undefined,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: '#64748b',
      appointment_set: '#06b6d4',
      prospect: '#14b8a6',
      approved: '#10b981',
      project_scheduled: '#22c55e',
      completed: '#84cc16',
      invoiced: '#a3e635',
      lien_legal: '#f59e0b',
      closed_deal: '#10b981',
      closed_lost: '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      lead: 'Lead',
      appointment_set: 'Appointment Set',
      prospect: 'Prospect',
      approved: 'Approved',
      project_scheduled: 'Scheduled',
      completed: 'Completed',
      invoiced: 'Invoiced',
      lien_legal: 'Lien Legal',
      closed_deal: 'Closed',
      closed_lost: 'Lost',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4aa" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <Text style={styles.subtitle}>{jobs?.length || 0} total</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#00d4aa"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.jobCard}
            onPress={() => router.push(`/job/${item.id}`)}
          >
            <View style={styles.jobHeader}>
              <Text style={styles.jobName}>{item.fullName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>

            {item.address && (
              <Text style={styles.jobAddress}>{item.address}</Text>
            )}

            <View style={styles.jobFooter}>
              {item.phone && (
                <Text style={styles.jobPhone}>{item.phone}</Text>
              )}
              {item.dealType && (
                <Text style={styles.dealType}>{item.dealType}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  jobAddress: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  dealType: {
    fontSize: 12,
    color: '#00d4aa',
    textTransform: 'capitalize',
  },
});
