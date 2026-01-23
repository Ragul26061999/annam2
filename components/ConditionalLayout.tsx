'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isStandalonePage = pathname === '/batch-validation' || pathname === '/settings/pharmacy/batch-validation';

  if (isLoginPage || isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0 print:h-auto">
          {children}
        </main>
      </div>
    </div>
  );
}