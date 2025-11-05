// src/app/payment/error/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentErrorPage() {
  const router = useRouter();

  useEffect(() => {
    // Через 10 секунд перенаправляємо на premium
    const timer = setTimeout(() => {
      router.push('/premium');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1410 0%, #2a1e1a 50%, #1a1410 100%)',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '20px',
          padding: '3rem',
          maxWidth: '600px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>❌</div>
        <h1 style={{ fontSize: '2.5rem', color: '#d9534f', marginBottom: '1rem' }}>
          Помилка оплати
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#f8d9a6', marginBottom: '2rem' }}>
          На жаль, оплата не пройшла 😔
        </p>
        <p style={{ color: '#c9a96f', marginBottom: '2rem' }}>
          Можливо, ви скасували оплату або виникла помилка.
          <br />
          Спробуйте ще раз або зверніться до підтримки.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/premium"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              backgroundColor: '#4c8a52',
              color: '#fff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5ba963')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4c8a52')}
          >
            🔄 Спробувати знову
          </Link>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              backgroundColor: '#705444',
              color: '#f8d9a6',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8a6652')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#705444')}
          >
            🏠 На головну
          </Link>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#a58b6f', marginTop: '1.5rem' }}>
          Автоматичне перенаправлення на Premium через 10 секунд...
        </p>
      </div>
    </div>
  );
}