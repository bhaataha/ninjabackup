import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { ToastProvider } from '@/components/Toast';
import { SidebarProvider } from '@/components/SidebarContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <SidebarProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <TopBar />
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ToastProvider>
  );
}
