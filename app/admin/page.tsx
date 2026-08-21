import { chatGPTSignOutPath, type ChatGPTUser } from '@/app/chatgpt-auth';
import Link from 'next/link';
import { AdminDashboard } from './admin-dashboard';
import { AdminAccessError, requireAdmin } from './auth';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const result = await getAdminResult();
  if (result.user) {
    return <AdminDashboard adminName={result.user.displayName} adminEmail={result.user.email} />;
  }

  const error = result.error;
  return (
    <main className={styles.accessPage}>
      <section className={styles.accessCard} aria-labelledby="access-title">
        <span className={styles.accessIcon} aria-hidden="true">○</span>
        <p className={styles.eyebrow}>Yönetici erişimi</p>
        <h1 id="access-title">Bu hesap yetkili değil</h1>
        <p>
          {error.email ? <><strong>{error.email}</strong> adresi yönetici izin listesinde bulunmuyor. </> : null}
          {error.message}
        </p>
        <div className={styles.accessActions}>
          <Link className={styles.primaryButton} href="/">Siteye dön</Link>
          <a className={styles.secondaryButton} href={chatGPTSignOutPath('/admin')}>Başka hesapla giriş yap</a>
        </div>
      </section>
    </main>
  );
}

async function getAdminResult(): Promise<
  { user: ChatGPTUser; error: null } | { user: null; error: AdminAccessError }
> {
  try {
    const user = await requireAdmin('/admin');
    return { user, error: null };
  } catch (error) {
    if (!(error instanceof AdminAccessError)) throw error;
    return { user: null, error };
  }
}
