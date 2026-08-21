export type Service = {
  slug: string;
  name: string;
  short: string;
  description: string;
  duration: string;
  price: string;
  accent: string;
  popular?: boolean;
  features: string[];
};

export const services: Service[] = [
  {
    slug: 'dis-yikama-cila',
    name: 'Dış Yıkama & Cila',
    short: 'Parlak ve korunaklı bir dış yüzey.',
    description: 'Ön yıkama, güvenli el yıkama ve hızlı cila ile aracın dış yüzeyini tazeler.',
    duration: '60 dk',
    price: 'Fiyat yakında',
    accent: 'coral',
    features: ['Ön yıkama', 'El ile dış yıkama', 'Jant ve lastik bakımı', 'Hızlı cila', 'Cam dış yüzeyleri'],
  },
  {
    slug: 'mini-ic-dis',
    name: 'Mini İç-Dış',
    short: 'Düzenli bakım için dengeli paket.',
    description: 'Dış yıkamaya temel iç süpürme ve yüzey temizliğini ekleyen pratik bakım.',
    duration: '90 dk',
    price: 'Fiyat yakında',
    accent: 'sun',
    features: ['Dış yıkama', 'İç vakumlama', 'Konsol temizliği', 'Paspas bakımı', 'İç-dış camlar'],
  },
  {
    slug: 'mini-ic-dis-plus',
    name: 'Mini İç-Dış Plus',
    short: 'Detaylara inen yoğun bakım.',
    description: 'Mini İç-Dış paketine detay fırçalama ve daha kapsamlı yüzey bakımı ekler.',
    duration: '120 dk',
    price: 'Fiyat yakında',
    accent: 'cyan',
    popular: true,
    features: ['Mini İç-Dış içeriği', 'Detay fırçalama', 'Plastik yüzey bakımı', 'Kapı içleri', 'Lastik parlatıcı'],
  },
  {
    slug: 'evcil-hayvan',
    name: 'Evcil Hayvan Paketi',
    short: 'Tüy ve koku için hedefli temizlik.',
    description: 'Evcil hayvan tüylerine ve kabin içinde biriken kokulara odaklanan özel uygulama.',
    duration: '150 dk',
    price: 'Fiyat yakında',
    accent: 'violet',
    features: ['Yoğun tüy toplama', 'Derin vakumlama', 'Koku nötralizasyonu', 'Koltuk araları', 'Bagaj temizliği'],
  },
  {
    slug: 'full-detayli',
    name: 'Full Detaylı Temizlik',
    short: 'Aracınız için kapsamlı yenilenme.',
    description: 'Kabin, döşeme ve dış yüzeyi en ince ayrıntısına kadar ele alan kapsamlı paket.',
    duration: '240 dk',
    price: 'Fiyat yakında',
    accent: 'navy',
    features: ['Detaylı iç-dış bakım', 'Koltuk ve taban yıkama', 'Tavan temizliği', 'Detay fırçalama', 'Koruyucu uygulama'],
  },
  {
    slug: 'sadece-ic',
    name: 'Sadece İç Temizlik',
    short: 'Kabin ferahlığına odaklanın.',
    description: 'Dış yıkamaya ihtiyaç duymadan kabin içindeki temel temas noktalarını temizler.',
    duration: '90 dk',
    price: 'Fiyat yakında',
    accent: 'green',
    features: ['İç vakumlama', 'Konsol ve torpido', 'Paspas temizliği', 'İç camlar', 'Bagaj vakumlama'],
  },
];

export const extras = [
  { slug: 'motor-temizligi', name: 'Motor bölmesi temizliği', copy: 'Hassas noktalara kontrollü uygulama.', duration: '+30 dk' },
  { slug: 'koltuk-yikama', name: 'Koltuk yıkama', copy: 'Kumaş yüzeylerde derinlemesine bakım.', duration: '+60 dk' },
  { slug: 'far-parlatma', name: 'Far parlatma', copy: 'Matlaşmış yüzeylerin görünümünü iyileştirir.', duration: '+45 dk' },
  { slug: 'koku-giderme', name: 'Koku giderme', copy: 'Kabin içindeki kalıcı kokulara hedefli uygulama.', duration: '+30 dk' },
];

export const districts = ['Çankaya', 'Yenimahalle', 'Keçiören', 'Etimesgut', 'Gölbaşı', 'Mamak', 'Sincan'];

export const faqs = [
  ['Mobil oto yıkama için ne hazırlamam gerekiyor?', 'Aracın çevresinde çalışabileceğimiz güvenli bir alan yeterli. Su ve elektrik ihtiyacı seçilen hizmete ve ekipman durumuna göre randevu onayı sırasında netleştirilir.'],
  ['Randevum ne zaman kesinleşir?', 'Gönderdiğiniz talep önce “onay bekliyor” durumuna gelir. Ekibimiz bölge, süre ve kapasiteyi kontrol ettikten sonra e-posta veya telefonla onay verir.'],
  ['Ödeme nasıl yapılıyor?', 'İlk sürümde ödeme hizmet tamamlandığında yüz yüze alınır. Sitede kart bilgisi istenmez ve çevrim içi ödeme yapılmaz.'],
  ['Hangi ilçelere hizmet veriyorsunuz?', 'Aktif hizmet bölgeleri randevu ekranındaki ilçe listesinde görünür. İlçeniz listede yoksa WhatsApp üzerinden yakın dönem planımızı sorabilirsiniz.'],
  ['Randevumu değiştirebilir veya iptal edebilir miyim?', 'Randevu sonrasında verilen güvenli bağlantıyı kullanarak, varsayılan olarak başlangıç saatinden iki saat öncesine kadar iptal veya değişiklik talebi oluşturabilirsiniz. Değiştirilen randevu yeniden onaya gider.'],
  ['Yağmurlu havada ne olur?', 'Hava koşulları hizmet kalitesini veya güvenliği etkilerse ekibimiz sizinle iletişime geçerek uygun yeni bir zaman önerir.'],
  ['Aracım çok kirliyse ek ücret çıkar mı?', 'Talep notlarına aracın durumunu yazabilirsiniz. Paketin kapsamını aşan bir ihtiyaç görülürse işlem başlamadan önce bilgi ve onay verilir.'],
  ['Randevu talebinde neden plaka isteniyor?', 'Ekibin doğru aracı kolayca bulması ve operasyon kaydının karışmaması için kullanılır. Gereksiz kişisel veri toplamıyoruz.'],
] as const;
