import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../features/common/layouts/AuthLayout';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { CalendarPage } from '../features/calendar/pages/CalendarPage';
import { BookingPage } from '../features/booking/pages/BookingPage';
import MyBookingsPage from '../features/booking/pages/MyBookingsPage';
import FixedBookingPage from '../pages/FixedBookingPage';
import { CustomerDashboard } from '../features/dashboard/pages/CustomerDashboard';
import TransactionHistory from '../features/dashboard/pages/TransactionHistory';
import SettingsPage from '../features/settings/pages/SettingsPage';
import AdminDashboard from '../features/admin/pages/AdminDashboard';
import AdminBookingsPage from '../features/admin/pages/AdminBookingsPage';
import AdminCourtsPage from '../features/admin/pages/AdminCourtsPage';
import AdminPaymentsPage from '../features/admin/pages/AdminPaymentsPage';
import AdminUsersPage from '../features/admin/pages/AdminUsersPage';
import AdminReportsPage from '../features/admin/pages/AdminReportsPage';
import AdminInventoryPage from '../features/admin/pages/AdminInventoryPage';
import StaffDashboard from '../features/staff/pages/StaffDashboard';
import CheckInPage from '../features/staff/pages/CheckInPage';
import StaffCourtsPage from '../features/staff/pages/StaffCourtsPage';
import StaffPosPage from '../features/staff/pages/StaffPosPage';
import { NotFound } from '../features/common/components/NotFound';
import PaymentResultPage from '../features/payment/pages/PaymentResultPage';

// 🎨 New Role-based Layouts
import { CustomerLayout, StaffLayout, AdminLayout } from '../layouts';

const HomePage: React.FC = () => (
  <div className="bg-white shadow rounded-lg p-6">
    <h1 className="text-xl font-semibold">Home</h1>
    <p className="text-slate-600 mt-2">Welcome to Smart Badminton Booking.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/calendar" replace />,
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    // 👑 Admin Routes - Full Sidebar Layout
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="ADMIN">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'bookings',
        element: <AdminBookingsPage />,
      },
      {
        path: 'courts',
        element: <AdminCourtsPage />,
      },
      {
        path: 'payments',
        element: <AdminPaymentsPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
      {
        path: 'inventory',
        element: <AdminInventoryPage />,
      },
    ],
  },
  {
    // 👨‍💼 Staff Routes - Compact Sidebar Layout
    path: '/staff',
    element: (
      <ProtectedRoute requiredRole="STAFF">
        <StaffLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <StaffDashboard />,
      },
      {
        path: 'checkin',
        element: <CheckInPage />,
      },
      {
        path: 'courts',
        element: <StaffCourtsPage />,
      },
      {
        path: 'pos',
        element: <StaffPosPage />,
      },
    ],
  },
  {
    // 🛒 Customer Routes - Top Navbar Layout
    path: '/',
    element: (
      <ProtectedRoute>
        <CustomerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'bookings',
        element: <BookingPage />,
      },
      {
        path: 'fixed-booking',
        element: <FixedBookingPage />,
      },
      {
        path: 'my-bookings',
        element: <MyBookingsPage />,
      },
      {
        path: 'dashboard',
        element: <CustomerDashboard />,
      },
      {
        path: 'transaction-history',
        element: <TransactionHistory />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/payment',
    children: [
      {
        path: 'result',
        element: <PaymentResultPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
