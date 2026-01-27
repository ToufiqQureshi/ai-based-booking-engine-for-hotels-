import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Auth Pages
import LoginPage from "@/pages/auth/Login";
import SignupPage from "@/pages/auth/Signup";
import ForgotPasswordPage from "@/pages/auth/ForgotPassword";
import ResetPasswordPage from "@/pages/auth/ResetPassword";

// Dashboard Layout & Pages
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardPage from "@/pages/Dashboard";
import RoomsPage from "@/pages/Rooms";
import RatesPage from "@/pages/Rates";
import AvailabilityPage from "@/pages/Availability";
import BookingsPage from "@/pages/Bookings";
import GuestsPage from "@/pages/Guests";
import PaymentsPage from "@/pages/Payments";
import ReportsPage from "@/pages/Reports";
import AddonsPage from "@/pages/Addons";
import SettingsPage from "@/pages/Settings";
import IntegrationPage from "@/pages/Integration";
import ChannelSettings from './pages/dashboard/ChannelSettings';
import Amenities from './pages/dashboard/Amenities';
import RatesShopper from "@/pages/RatesShopper";
import AdminDashboard from "@/pages/AdminDashboard";

import NotFound from "@/pages/NotFound";

import { PublicBookingLayout } from "@/layouts/PublicBookingLayout";
import BookingSelection from "@/pages/public/BookingSelection";
import BookingCheckout from "@/pages/public/BookingCheckout";
import BookingConfirmation from "@/pages/public/BookingConfirmation";
import BookingWidget from "@/pages/public/BookingWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/rates" element={<RatesPage />} />
              <Route path="/availability" element={<AvailabilityPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/guests" element={<GuestsPage />} />
              <Route path="/rate-shopper" element={<RatesShopper />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/addons" element={<AddonsPage />} />
              <Route path="/amenities" element={<Amenities />} />
              <Route path="/channel-settings" element={<ChannelSettings />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/integration" element={<IntegrationPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Public Booking Engine Routes */}
            <Route path="/book/:hotelSlug" element={<PublicBookingLayout />}>
              <Route index element={<Navigate to="rooms" replace />} />
              <Route path="rooms" element={<BookingSelection />} />
              <Route path="checkout" element={<BookingCheckout />} />
              <Route path="confirmation" element={<BookingConfirmation />} />
            </Route>

            {/* Standalone Widget Route */}
            <Route path="/book/:hotelSlug/widget" element={<BookingWidget />} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
