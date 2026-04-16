import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { ToastProvider } from '@/components/Toast';
import { SidebarProvider } from '@/components/SidebarContext';
import { LocaleProvider } from '@/components/LocaleProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LocaleProvider>
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
      </LocaleProvider>
    </ThemeProvider>
  );
}
