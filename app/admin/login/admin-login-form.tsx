'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

export function AdminLoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Giriş yapılamadı.');
      window.location.assign('/admin');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Giriş yapılamadı.');
      setBusy(false);
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={submit}>
      <label>Kullanıcı adı<input name="username" autoComplete="username" required maxLength={40} autoFocus /></label>
      <label>Şifre<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
      {error ? <p className={styles.loginError} role="alert">{error}</p> : null}
      <button type="submit" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
      <Link href="/">Siteye dön</Link>
    </form>
  );
}
