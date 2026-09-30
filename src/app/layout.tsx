import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Wiring Diagram QC Assistant • AI Quality Control SaaS | Spandsons Horizon Engineering',
  description: 'AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.',
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
