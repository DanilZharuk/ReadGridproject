// src/app/payment/success/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Через 5 секунд перенаправляємо на головну
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

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
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '2.5rem', color: '#4c8a52', marginBottom: '1rem' }}>
          Оплата успішна!
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#f8d9a6', marginBottom: '2rem' }}>
          Ви отримали Premium-доступ до ReadGrid! 🎉
        </p>
        <p style={{ color: '#c9a96f', marginBottom: '2rem' }}>
          Тепер вам доступні всі преміум-книги з нашого каталогу.
          <br />
          Приємного читання!
        </p>
        <Link
          href="/"
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
          🏠 На головну
        </Link>
        <p style={{ fontSize: '0.9rem', color: '#a58b6f', marginTop: '1.5rem' }}>
          Автоматичне перенаправлення через 5 секунд...
        </p>
      </div>
    </div>
  );
}