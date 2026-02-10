// Dashboard Home Page - Real API Integration
import { useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarX,
  CreditCard,
  Users,
  Bed,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/api/client';
import { DashboardStats } from '@/types/api';
import { WelcomeCard } from '@/components/WelcomeCard';

interface RecentBooking {
  id: string;
  booking_number: string;
  guest: {
    first_name: string;
    last_name: string;
  };
  rooms: Array<{ room_type_name: string }>;
  check_in: string;
  status: string;
}

export function DashboardPage() {
  const { hotel, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch stats
        const statsData = await apiClient.get<DashboardStats>('/dashboard/stats');
        setStats(statsData);

        // Fetch recent bookings
        try {
          const bookingsData = await apiClient.get<RecentBooking[]>('/dashboard/recent-bookings');
          setRecentBookings(bookingsData);
        } catch {
          console.log('Could not fetch recent bookings');
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}. Here's what's happening at {hotel?.name || 'your hotel'}.
        </p>

        {/* Welcome Message */}
        <WelcomeCard message="Today is a great day to manage your hotel! 🚀" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Arrivals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Arrivals</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today_arrivals || 0}</div>
            <p className="text-xs text-muted-foreground">
              guests checking in today
            </p>
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Departures</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today_departures || 0}</div>
            <p className="text-xs text-muted-foreground">
              guests checking out today
            </p>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Occupancy</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.current_occupancy || 0}</div>
            <p className="text-xs text-muted-foreground">
              rooms currently occupied
            </p>
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.today_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              from bookings today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending_bookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              require confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_rooms || 0}</div>
            <p className="text-xs text-muted-foreground">
              rooms across all types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Property Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              accepting bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest booking activity at your property</CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings yet</p>
              <p className="text-sm">Bookings will appear here as they come in</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {booking.guest?.first_name} {booking.guest?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.rooms?.[0]?.room_type_name || 'Room'} • Check-in: {booking.check_in}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'checked_in'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {booking.status}
                    </span>
                    <span className="text-sm text-muted-foreground">{booking.booking_number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardPage;
