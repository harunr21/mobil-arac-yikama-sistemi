import { redirect } from 'next/navigation';
import { getAdminUser } from '../auth';
import { AdminLoginForm } from './admin-login-form';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect('/admin');

  return (
    <main className={styles.accessPage}>
      <section className={`${styles.accessCard} ${styles.loginCard}`} aria-labelledby="login-title">
        <span className={styles.accessIcon} aria-hidden="true">AM</span>
        <p className={styles.eyebrow}>Yönetici erişimi</p>
        <h1 id="login-title">Panele giriş yapın</h1>
        <p>Randevuları ve işletme ayarlarını yönetmek için hesabınızla giriş yapın.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
