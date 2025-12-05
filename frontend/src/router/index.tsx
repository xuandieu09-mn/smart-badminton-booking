import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../features/common/layouts/MainLayout';
import { AuthLayout } from '../features/common/layouts/AuthLayout';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { CalendarPage } from '../features/calendar/pages/CalendarPage';
import { BookingPage } from '../features/booking/pages/BookingPage';
import { CustomerDashboard } from '../features/dashboard/pages/CustomerDashboard';
import AdminDashboard from '../features/admin/pages/AdminDashboard';
import { NotFound } from '../features/common/components/NotFound';

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
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="ADMIN">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
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
        path: 'dashboard',
        element: <CustomerDashboard />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);