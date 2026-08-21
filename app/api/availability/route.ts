import { NextResponse } from 'next/server';
import { AvailabilityError, getAvailabilityDetails } from '@/app/lib/availability';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const service = (url.searchParams.get('service') ?? '').trim();
  const date = (url.searchParams.get('date') ?? '').trim();
  const extras = (url.searchParams.get('extras') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!service) return NextResponse.json({ error: 'Bir hizmet seçin.' }, { status: 400 });
  try {
    const details = await getAvailabilityDetails(service, date, extras);
    return NextResponse.json({
      slots: details.slots,
      durationMinutes: details.durationMinutes,
      closedReason: details.closedReason,
    });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('availability_failed', error);
    return NextResponse.json({ error: 'Uygunluk şu anda alınamıyor.' }, { status: 500 });
  }
}
