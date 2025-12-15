import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { SocketDebugPanel } from '../components/SocketDebugPanel';

export const MainLayout = () => {
  const isDev = import.meta.env.DEV; // Only show in development

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
      <Footer />
      {isDev && <SocketDebugPanel />}
    </div>
  );
};
