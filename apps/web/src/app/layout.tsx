import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NinjaBackup — Multi-Tenant Backup Management',
  description: 'Enterprise backup management platform with zero-knowledge encryption, file versioning, and image backup.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
