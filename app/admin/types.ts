export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type AdminBooking = {
  id: string;
  reference: string;
  status: BookingStatus;
  serviceName: string;
  requestedDate: string;
  startTime: string;
  district: string;
  address: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicle: string;
  totalCents: number | null;
  notificationStatus: string | null;
  notificationError: string | null;
  createdAt: string;
};

export type AdminService = {
  id: string;
  name: string;
  priceCents: number | null;
  durationMinutes: number;
  active: boolean;
  popular: boolean;
  sortOrder: number;
};

export type AdminExtra = {
  id: string;
  name: string;
  priceCents: number | null;
  durationMinutes: number;
  active: boolean;
};

export type AdminArea = { id: string; district: string; active: boolean };

export type AdminRule = {
  id: string;
  weekday: number;
  openTime: string;
  closeTime: string;
  capacity: number;
  active: boolean;
};

export type AdminGalleryItem = {
  id: string;
  title: string;
  district: string;
  completedAt: string;
  published: boolean;
  imageCount: number;
};

export type AdminReview = {
  id: string;
  customerName: string;
  rating: number;
  quote: string;
  published: boolean;
  sortOrder: number;
};

export type AdminSnapshot = {
  bookings: AdminBooking[];
  services: AdminService[];
  extras: AdminExtra[];
  areas: AdminArea[];
  rules: AdminRule[];
  gallery: AdminGalleryItem[];
  reviews: AdminReview[];
  settings: Record<string, string>;
};
