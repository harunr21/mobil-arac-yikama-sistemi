import { ManageBooking } from '../../../components/manage-booking';

export const dynamic = 'force-dynamic';
export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <main className="manage-page"><ManageBooking token={token} /></main>; }
