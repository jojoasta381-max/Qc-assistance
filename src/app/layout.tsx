import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Wiring Diagram QC Assistant • AI Quality Control SaaS | Spandsons Horizon Engineering',
  description: 'AI-first commercial SaaS platform to inspect, validate, and certify wiring diagrams, cable harnesses, and schematics against IPC-620, UL 508A, and IPC-610 standards.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#060B14] text-slate-100 antialiased min-h-screen font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
