'use client';

import { useEffect, useState } from 'react';

export function PwaProvider() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Register service worker (production only — dev mode caching breaks HMR)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Unregister any stale SW in dev mode
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }

    // Offline detection
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      window.location.reload();
    };

    if (!navigator.onLine) setOffline(true);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#d32f2f',
        color: '#fff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      📡 等待伺服器連線...
    </div>
  );
}
