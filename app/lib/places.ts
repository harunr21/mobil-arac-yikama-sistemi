import { env } from 'cloudflare:workers';

type AddressComponent = { longText?: string; shortText?: string; types?: string[] };

function apiKey() {
  return (env as unknown as { GOOGLE_PLACES_API_KEY?: string }).GOOGLE_PLACES_API_KEY?.trim() || '';
}

export function placesConfigured() { return Boolean(apiKey()); }

export async function autocompleteAnkara(input: string, sessionToken?: string) {
  const key = apiKey();
  if (!key || input.trim().length < 3) return [];
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input: input.trim(),
      languageCode: 'tr',
      regionCode: 'tr',
      includedRegionCodes: ['tr'],
      locationRestriction: { circle: { center: { latitude: 39.9334, longitude: 32.8597 }, radius: 50000 } },
      sessionToken: sessionToken || undefined,
    }),
  });
  if (!response.ok) throw new Error(`Google Places ${response.status}`);
  const body = await response.json() as { suggestions?: Array<{ placePrediction?: { place?: string; placeId?: string; text?: { text?: string } } }> };
  return (body.suggestions || []).flatMap((item) => {
    const prediction = item.placePrediction;
    const id = prediction?.placeId || prediction?.place?.replace(/^places\//, '');
    const text = prediction?.text?.text;
    return id && text ? [{ id, text }] : [];
  }).slice(0, 6);
}

export async function verifyAnkaraPlace(placeId: string, district: string): Promise<'verified' | 'mismatch' | 'unavailable'> {
  const key = apiKey();
  if (!key) return 'unavailable';
  if (!/^[A-Za-z0-9_-]{10,220}$/.test(placeId)) return 'mismatch';
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
        'Accept-Language': 'tr',
      },
    });
    if (response.status >= 500 || response.status === 429) return 'unavailable';
    if (!response.ok) return 'mismatch';
    const place = await response.json() as { formattedAddress?: string; addressComponents?: AddressComponent[] };
    const components = place.addressComponents || [];
    const country = components.find((item) => item.types?.includes('country'))?.shortText;
    const province = components.find((item) => item.types?.includes('administrative_area_level_1'))?.longText;
    const haystack = [place.formattedAddress, ...components.map((item) => item.longText)].filter(Boolean).join(' ');
    return country === 'TR' && normalize(province || '').includes('ankara') && normalize(haystack).includes(normalize(district)) ? 'verified' : 'mismatch';
  } catch (error) {
    console.error('google_place_verification_unavailable', error);
    return 'unavailable';
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
}
