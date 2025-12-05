import { useAuthStore } from '@/store/authStore';

export const CustomerDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name || user?.email}!</h2>
        <p className="text-gray-600">Role: {user?.role}</p>
      </div>
    </div>
  );
};