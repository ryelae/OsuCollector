import { Nav } from '@/components/nav';
import { requireAuth } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  requireAuth();

  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
