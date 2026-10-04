'use client'

import { usePathname } from 'next/navigation';
import { Navbar } from './nav';
import Footer from './footer';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = pathname === '/' || pathname === '/fsl';

  if (isWide) {
    return (
      <div className="w-full flex flex-col min-h-screen">
        <main className="flex-auto min-w-0 flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-4 mt-8 lg:mx-auto w-full px-2 md:px-0 flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-auto min-w-0 mt-6 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
