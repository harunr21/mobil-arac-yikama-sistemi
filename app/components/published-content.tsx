import Image from 'next/image';
import { ensureDatabase, getRawD1 } from '../lib/db';

type Review = { id: string; customer_name: string; rating: number; quote: string };
type GalleryItem = { id: string; title: string; district: string; completed_at: string; image_id: string; alt_text: string };

export async function PublishedContent() {
  await ensureDatabase();
  const db = getRawD1();
  const [reviewRows, galleryRows] = await Promise.all([
    db.prepare('SELECT id, customer_name, rating, quote FROM reviews WHERE published = 1 ORDER BY sort_order, created_at DESC LIMIT 8').all<Review>(),
    db.prepare(`SELECT g.id, g.title, g.district, g.completed_at, i.id AS image_id, i.alt_text
      FROM gallery_items g JOIN gallery_images i ON i.gallery_item_id = g.id
      WHERE g.published = 1 ORDER BY g.completed_at DESC, i.sort_order LIMIT 10`).all<GalleryItem>(),
  ]);
  const reviews = reviewRows.results || [];
  const gallery = galleryRows.results || [];
  if (!reviews.length && !gallery.length) return null;
  return <>
    {reviews.length > 0 && <section className="reviews-section"><div className="section-heading centered"><p className="eyebrow dark">MÜŞTERİLERİMİZDEN</p><h2>Ardımızda temiz izler.</h2></div><div className="review-track">{reviews.map((review) => <article key={review.id}><span aria-label={`${review.rating} yıldız`}>{'★'.repeat(review.rating)}</span><blockquote>“{review.quote}”</blockquote><strong>{review.customer_name}</strong></article>)}</div></section>}
    {gallery.length > 0 && <section className="gallery-section"><div className="section-heading centered"><p className="eyebrow">SON İŞLER</p><h2>Bakım sonrası fark.</h2></div><div className="gallery-track">{gallery.map((item) => <figure key={item.image_id}><Image src={`/api/gallery/${item.image_id}`} alt={item.alt_text} width={280} height={360} sizes="(max-width: 959px) 220px, 280px" /><figcaption><strong>{item.title}</strong><span>{item.district} · {item.completed_at}</span></figcaption></figure>)}</div></section>}
  </>;
}
