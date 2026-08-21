import { redirect } from 'next/navigation';
import { AdminDashboard } from './admin-dashboard';
import { getAdminUser } from './auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return <AdminDashboard adminName={user.displayName} />;
}
