import { NextResponse } from 'next/server';
import { autocompleteAnkara, placesConfigured } from '@/app/lib/places';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = (url.searchParams.get('input') || '').trim().slice(0, 160);
  const session = (url.searchParams.get('session') || '').slice(0, 128);
  if (!placesConfigured()) return NextResponse.json({ configured: false, suggestions: [] });
  if (input.length < 3) return NextResponse.json({ configured: true, suggestions: [] });
  try {
    return NextResponse.json({ configured: true, suggestions: await autocompleteAnkara(input, session) });
  } catch (error) {
    console.error('google_places_autocomplete_failed', error);
    return NextResponse.json({ configured: true, unavailable: true, suggestions: [] }, { status: 503 });
  }
}
