INSERT OR IGNORE INTO services
  (id, slug, name, short_description, accent, price_cents, duration_minutes, sort_order, active, popular)
VALUES
  ('svc-exterior', 'dis-yikama-cila', 'Dış Yıkama & Cila', 'Köpüklü dış yıkama, jant temizliği ve hızlı koruyucu cila.', '#11b7ad', NULL, 60, 1, 1, 0),
  ('svc-mini', 'mini-ic-dis', 'Mini İç-Dış', 'Günlük kullanım için pratik iç ve dış temizlik.', '#19a9e5', NULL, 90, 2, 1, 0),
  ('svc-mini-plus', 'mini-ic-dis-plus', 'Mini İç-Dış Plus', 'Detaylı iç yüzey bakımıyla güçlendirilmiş mini paket.', '#6d78e8', NULL, 120, 3, 1, 1),
  ('svc-pet', 'evcil-hayvan-paketi', 'Evcil Hayvan Paketi', 'Tüy, koku ve temas yüzeylerine özel yoğun temizlik.', '#8b65d8', NULL, 150, 4, 1, 0),
  ('svc-detail', 'full-detayli-temizlik', 'Full Detaylı Temizlik', 'Aracın iç ve dış yüzeylerinde kapsamlı detay uygulaması.', '#0d6b78', NULL, 240, 5, 1, 0),
  ('svc-interior', 'sadece-ic-temizlik', 'Sadece İç Temizlik', 'Kabin, koltuk, paspas ve bagaj odaklı iç temizlik.', '#3aa86b', NULL, 120, 6, 1, 0);

INSERT OR IGNORE INTO service_features (id, service_id, label, sort_order)
VALUES
  ('sf-1-1', 'svc-exterior', 'Basınçlı ön durulama', 1),
  ('sf-1-2', 'svc-exterior', 'Köpüklü el yıkama', 2),
  ('sf-1-3', 'svc-exterior', 'Jant ve lastik bakımı', 3),
  ('sf-1-4', 'svc-exterior', 'Hızlı koruyucu cila', 4),
  ('sf-2-1', 'svc-mini', 'Dış yıkama', 1),
  ('sf-2-2', 'svc-mini', 'İç süpürme', 2),
  ('sf-2-3', 'svc-mini', 'Torpido ve yüzey silme', 3),
  ('sf-2-4', 'svc-mini', 'Cam temizliği', 4),
  ('sf-3-1', 'svc-mini-plus', 'Mini İç-Dış kapsamı', 1),
  ('sf-3-2', 'svc-mini-plus', 'Detaylı plastik bakımı', 2),
  ('sf-3-3', 'svc-mini-plus', 'Bagaj temizliği', 3),
  ('sf-3-4', 'svc-mini-plus', 'Koku giderme', 4),
  ('sf-4-1', 'svc-pet', 'Yoğun tüy toplama', 1),
  ('sf-4-2', 'svc-pet', 'Koku nötralizasyonu', 2),
  ('sf-4-3', 'svc-pet', 'Koltuk ve zemin detay', 3),
  ('sf-4-4', 'svc-pet', 'İç yüzey hijyeni', 4),
  ('sf-5-1', 'svc-detail', 'Detaylı iç temizlik', 1),
  ('sf-5-2', 'svc-detail', 'Detaylı dış temizlik', 2),
  ('sf-5-3', 'svc-detail', 'Leke odaklı uygulama', 3),
  ('sf-5-4', 'svc-detail', 'Koruyucu yüzey bakımı', 4),
  ('sf-6-1', 'svc-interior', 'Kabin ve bagaj süpürme', 1),
  ('sf-6-2', 'svc-interior', 'Koltuk ve paspas temizliği', 2),
  ('sf-6-3', 'svc-interior', 'Plastik yüzey bakımı', 3),
  ('sf-6-4', 'svc-interior', 'İç cam temizliği', 4);

INSERT OR IGNORE INTO extras
  (id, slug, name, description, price_cents, duration_minutes, active, sort_order)
VALUES
  ('ext-seat', 'koltuk-leke-uygulamasi', 'Koltuk Leke Uygulaması', 'Belirli lekelere yoğun bölgesel uygulama.', NULL, 30, 1, 1),
  ('ext-engine', 'motor-yuzey-temizligi', 'Motor Yüzey Temizliği', 'Uygun bölgelere kontrollü yüzey temizliği.', NULL, 30, 1, 2),
  ('ext-odor', 'ozon-koku-giderme', 'Ozon ile Koku Giderme', 'Kabin kokularına destekleyici ozon uygulaması.', NULL, 30, 1, 3);

INSERT OR IGNORE INTO service_areas (id, district, active)
VALUES
  ('area-1', 'Akyurt', 0),
  ('area-2', 'Altındağ', 0),
  ('area-3', 'Ayaş', 0),
  ('area-4', 'Bala', 0),
  ('area-5', 'Beypazarı', 0),
  ('area-6', 'Çamlıdere', 0),
  ('area-7', 'Çankaya', 1),
  ('area-8', 'Çubuk', 0),
  ('area-9', 'Elmadağ', 0),
  ('area-10', 'Etimesgut', 1),
  ('area-11', 'Evren', 0),
  ('area-12', 'Gölbaşı', 1),
  ('area-13', 'Güdül', 0),
  ('area-14', 'Haymana', 0),
  ('area-15', 'Kahramankazan', 0),
  ('area-16', 'Kalecik', 0),
  ('area-17', 'Keçiören', 1),
  ('area-18', 'Kızılcahamam', 0),
  ('area-19', 'Mamak', 1),
  ('area-20', 'Nallıhan', 0),
  ('area-21', 'Polatlı', 0),
  ('area-22', 'Pursaklar', 1),
  ('area-23', 'Sincan', 1),
  ('area-24', 'Şereflikoçhisar', 0),
  ('area-25', 'Yenimahalle', 1);

INSERT OR IGNORE INTO availability_rules
  (id, weekday, open_time, close_time, capacity, active)
VALUES
  ('rule-0', 0, '09:00', '17:00', 1, 0),
  ('rule-1', 1, '09:00', '18:00', 1, 1),
  ('rule-2', 2, '09:00', '18:00', 1, 1),
  ('rule-3', 3, '09:00', '18:00', 1, 1),
  ('rule-4', 4, '09:00', '18:00', 1, 1),
  ('rule-5', 5, '09:00', '18:00', 1, 1),
  ('rule-6', 6, '09:00', '18:00', 1, 1);

INSERT OR IGNORE INTO settings (key, value)
VALUES
  ('business_name', 'Ankara Mobil Oto Yıkama'),
  ('whatsapp_number', '905555555555'),
  ('booking_change_cutoff_hours', '2'),
  ('slot_minutes', '30');
