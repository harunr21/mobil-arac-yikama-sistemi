import type { Metadata } from 'next';
import { BookingWizard } from '../components/booking-wizard';

export const metadata: Metadata = { title: 'Randevu Talebi | Ankara Mobil Oto Yıkama', description: 'Hizmetinizi, adresinizi ve uygun zamanı seçerek mobil oto yıkama talebi oluşturun.' };
export default function BookingPage() { return <main className="booking-page"><BookingWizard /></main>; }
