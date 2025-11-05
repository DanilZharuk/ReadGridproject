'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DecodedToken {
  userId?: string;
  id?: string;
  username?: string;
  role?: string;
  exp?: number;
}

// 🔥 ДОДАНО: Нові інтерфейси
interface UserComment {
  _id: string;
  content: string;
  rating?: number;
  createdAt: string;
  bookId: {
    _id: string;
    title: string;
    coverUrl?: string;
  };
}

interface UserData {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  updatedAt?: string; // 🆕 додано
  isPremium?: boolean; // 🆕
  premiumUntil?: string; // 🆕
}

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [originalData, setOriginalData] = useState<{ username: string; email: string } | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 ДОДАНО: Нові state змінні
  const [role, setRole] = useState('user');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'comments'>('profile');
  const [comments, setComments] = useState<UserComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Ефект паутинки
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.id = "readgrid-web";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const mouse = { x: width / 2, y: height / 2, radius: 120 };

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    type Point = { x: number; y: number; vx: number; vy: number; phase: number };
    const points: Point[] = [];
    const pointCount = 50;

    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: 85 + Math.random() * (width - 170),
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < pointCount; i++) {
        const p1 = points[i];
        if (p1.x <= 85 || p1.x >= width - 85) continue;

        for (let j = i + 1; j < pointCount; j++) {
          const p2 = points[j];
          if (p2.x <= 85 || p2.x >= width - 85) continue;

          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 160) {
            const alpha = 0.05 + (1 - dist / 160) * 0.15 + 0.05 * Math.sin(p1.phase + Date.now() * 0.002);
            ctx.strokeStyle = `rgba(210,180,140,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < pointCount; i++) {
        const p = points[i];

        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.01;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.vx -= dx * 0.0002 * force;
          p.vy -= dy * 0.0002 * force;
        }

        if (p.x > 85 && p.x < width - 85) {
          ctx.fillStyle = `rgba(210,180,140,${0.2 + 0.1 * Math.sin(p.phase)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    };

    draw();

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      canvas.remove();
    };
  }, []);

  function parseJwtPayload(token: string): DecodedToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('readgrid_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const payload = parseJwtPayload(token);
    if (!payload) {
      localStorage.removeItem('readgrid_token');
      router.push('/login');
      return;
    }

    const uid = (payload.userId || payload.id) as string | undefined;
    if (!uid) {
      localStorage.removeItem('readgrid_token');
      router.push('/login');
      return;
    }

    setUserId(uid);
    fetchUser(uid, token);
    fetchComments(uid, token); // 🔥 ДОДАНО
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 ОНОВЛЕНО: fetchUser
  const fetchUser = async (id: string, token: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Fetch user failed, server response:', text);
        throw new Error('Не вдалось завантажити профіль');
      }
      const data = await res.json();
      setUserData(data);
      setUsername(data.username || '');
      setEmail(data.email || '');
      setRole(data.role || 'user');
      setIsPremium(data.isPremium || false); // 🆕
      setPremiumUntil(data.premiumUntil || null); // 🆕
      setOriginalData({ username: data.username || '', email: data.email || '' });
    } catch (err: any) {
      console.error('fetchUser error:', err);
      setMessage('❌ Помилка завантаження даних користувача');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ДОДАНО: fetchComments
  const fetchComments = async (id: string, token: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load comments');

      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // 🔥 ОНОВЛЕНО: handleSave
  // Замініть функцію handleSave у ProfilePage на цю:

  const handleSave = async () => {
    if (!userId) return;
    if (!username || username.length < 3) {
      setMessage('Ім\'я має бути принаймні 3 символи');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Невірний формат email');
      return;
    }
    if (password && password.length < 6) {
      setMessage('Пароль має бути мінімум 6 символів');
      return;
    }

    setLoading(true);
    setMessage('⏳ Збереження...');
    try {
      const token = localStorage.getItem('readgrid_token');
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email, password }),
      });

      const bodyText = await res.text();
      let data: any;
      try {
        data = JSON.parse(bodyText);
      } catch {
        console.error('Non-JSON response from /api/users/:', bodyText);
        throw new Error('Сервер повернув неочікувану відповідь');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Помилка при оновленні профілю');
      }

      // 🔥 ОНОВЛЮЄМО ТОКЕН В LOCALSTORAGE
      if (data.token) {
        localStorage.setItem('readgrid_token', data.token);
        console.log('✅ Новий токен збережено');

        // 🔥 ВИКЛИКАЄМО ПОДІЮ storage для оновлення HomePage
        window.dispatchEvent(new Event('storage'));
      }

      setMessage('✅ Профіль успішно оновлено!');
      setPassword('');
      setOriginalData({ username, email });

      if (userData) {
        setUserData({ ...userData, username, email });
      }
    } catch (err: any) {
      console.error('handleSave error:', err);
      setMessage(err.message || '❌ Помилка при оновленні профілю');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!originalData) return;
    setUsername(originalData.username);
    setEmail(originalData.email);
    setPassword('');
    setMessage('↩ Зміни скинуто');
  };

  // 🔥 ДОДАНО: handleDeleteComment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цей коментар?')) return;

    try {
      const token = localStorage.getItem('readgrid_token');
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete');

      setComments(comments.filter(c => c._id !== commentId));
      setMessage('✅ Коментар видалено');
    } catch (err) {
      setMessage('❌ Помилка при видаленні коментаря');
    }
  };

  // Додайте цю функцію після handleDeleteComment:
  const handleCancelSubscription = async () => {
    if (!confirm('Ви впевнені, що хочете скасувати Premium підписку? Ви втратите доступ до всіх преміум книг.')) {
      return;
    }

    setCancelling(true);
    setMessage('⏳ Скасування підписки...');

    const token = localStorage.getItem('readgrid_token');

    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✅ Підписку успішно скасовано');
        setIsPremium(false);
        setPremiumUntil(null);

        // Оновлюємо дані користувача
        if (userData) {
          setUserData({ ...userData, isPremium: false, premiumUntil: undefined });
        }

        // Викликаємо подію storage для оновлення HomePage
        window.dispatchEvent(new Event('storage'));
      } else {
        setMessage(`❌ ${data.message || 'Помилка скасування підписки'}`);
      }
    } catch (error) {
      setMessage('❌ Помилка з\'єднання з сервером');
    } finally {
      setCancelling(false);
    }
  };

  // 🔥 ДОДАНО: Helper функції
  function formatDate(date: string | Date | undefined | null) {
    if (!date) return 'Немає даних';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'Немає даних' : d.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }


  const getAverageRating = () => {
    const rated = comments.filter(c => c.rating);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, c) => acc + (c.rating || 0), 0);
    return (sum / rated.length).toFixed(1);
  };

  // 🔥 ОНОВЛЕНО: Перевірка перед return
  if (!userId || !userData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1410 0%, #2a1e1a 50%, #1a1410 100%)',
      }}>
        <p style={{ color: '#f8d9a6', fontSize: '1.2rem' }}>⏳ Завантаження...</p>
      </div>
    );
  }

  // Тут буде return з JSX...

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* === Фонові бокові зображення === */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '85px',
          height: '100%',
          backgroundImage: 'url("/side-left.png")',
          backgroundRepeat: 'repeat-y',
          backgroundSize: 'contain',
          opacity: 0.1,
          filter: 'blur(0.3px) brightness(1.1)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '85px',
          height: '100%',
          backgroundImage: 'url("/side-right.png")',
          backgroundRepeat: 'repeat-y',
          backgroundSize: 'contain',
          opacity: 0.1,
          filter: 'blur(0.3px) brightness(1.1)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* === Шапка === */}
      <header className="header" style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="logo-container"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
        >
          <img src="/logo.png" alt="ReadGrid logo" className="logo" style={{ width: 85, height: 85 }} />
          <div>
            <h1>ReadGrid</h1>
            <p className="subtitle">Мій профіль</p>
          </div>
        </div>
      </header>

      {/* === Перемикач вкладок === */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '1rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '10px 22px',
            backgroundColor: activeTab === 'profile' ? '#4c8a52' : '#705444',
            color: '#f4e9d8',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: '0.3s',
          }}
        >
          👤 Профіль
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          style={{
            padding: '10px 22px',
            backgroundColor: activeTab === 'comments' ? '#4c8a52' : '#705444',
            color: '#f4e9d8',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: '0.3s',
          }}
        >
          💬 Коментарі
        </button>
      </div>

      {/* === Вкладка ПРОФІЛЬ === */}
      {activeTab === 'profile' && (
        <>
          <section className="form" style={{ position: 'relative', zIndex: 1, marginTop: '1rem' }}>
            <input
              placeholder="Ім’я користувача"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <input
              placeholder="Електронна пошта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <input
              placeholder="Новий пароль (необов’язково)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </section>

          {/* === Кнопки === */}
          <div
            className="center-button"
            style={{ display: 'flex', justifyContent: 'center', gap: '1rem', zIndex: 1 }}
          >
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '10px 22px',
                backgroundColor: '#4c8a52',
                color: '#f4e9d8',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                transition: '0.3s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#5ba963')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4c8a52')}
            >
              💾 Зберегти
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                padding: '10px 22px',
                backgroundColor: '#d4a23b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                transition: '0.3s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#e1b75a')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#d4a23b')}
            >
              ↩️ Скинути
            </button>

            <button
              onClick={() => router.push('/')}
              style={{
                padding: '10px 22px',
                backgroundColor: '#705444',
                color: '#f8d9a6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                transition: '0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8a6652')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#705444')}
            >
              🏠 На головну
            </button>

            {/* 🆕 Кнопки Premium */}
            {!isPremium ? (
              <button
                onClick={() => router.push('/premium')}
                style={{
                  padding: '10px 22px',
                  backgroundColor: '#d4a23b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: '0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e1b75a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d4a23b')}
              >
                ✨ Отримати Premium
              </button>
            ) : (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                style={{
                  padding: '10px 22px',
                  backgroundColor: cancelling ? '#666' : '#8b4545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  transition: '0.3s',
                }}
                onMouseEnter={(e) => {
                  if (!cancelling) e.currentTarget.style.backgroundColor = '#a55555';
                }}
                onMouseLeave={(e) => {
                  if (!cancelling) e.currentTarget.style.backgroundColor = '#8b4545';
                }}
              >
                {cancelling ? '⏳ Скасування...' : '🚫 Скасувати підписку'}
              </button>
            )}
          </div>

          {/* === Додаткова інформація === */}
          <div
            style={{
              marginTop: '2.5rem',
              textAlign: 'left',
              color: '#f8d9a6',
              fontSize: '1.05rem',
              position: 'relative',
              zIndex: 1,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '18px',
              padding: '1.75rem 2.2rem',
              boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
              width: '88%',
              maxWidth: '720px',
              marginLeft: 'auto',
              marginRight: 'auto',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(3px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
              <h3
                style={{
                  margin: 0,
                  color: '#f8d9a6',
                  fontSize: '1.3rem',
                  letterSpacing: '0.6px',
                  textShadow: '0 0 6px rgba(0,0,0,0.25)',
                }}
              >
                📜 Додаткова інформація
              </h3>
              <div
                style={{
                  width: '94%',
                  height: '1px',
                  borderRadius: '2px',
                  marginTop: '0.7rem',
                  background: 'rgba(255,255,255,0.2)',
                }}
              />
            </div>

            {/* 🆕 Premium статус */}
            <div
              style={{
                marginTop: '1rem',
                marginBottom: '1.5rem', // 🟡 додаємо відстань після блоку Premium
                padding: '1rem',
                background: isPremium
                  ? 'linear-gradient(135deg, rgba(212,162,59,0.15) 0%, rgba(244,208,63,0.1) 100%)'
                  : 'rgba(112,84,68,0.1)',
                borderRadius: '12px',
                border: isPremium ? '1px solid rgba(212,162,59,0.3)' : '1px solid rgba(112,84,68,0.2)',
              }}
            >
              <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.35 }}>
                <span style={{ marginRight: '8px' }}>⭐</span>
                <span style={{ color: '#c9a96f', marginRight: '6px' }}>Статус підписки:</span>
                <strong style={{ color: isPremium ? '#d4a23b' : '#8a6652' }}>
                  {isPremium ? 'Premium активний' : 'Безкоштовний акаунт'}
                </strong>
              </p>

              {isPremium && premiumUntil && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#c9a96f' }}>
                  <span style={{ marginRight: '8px' }}>📅</span>
                  Premium до: <strong style={{ color: '#d4a23b' }}>{formatDate(premiumUntil)}</strong>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.35 }}>
                <span style={{ marginRight: '8px' }}>🧩</span>
                <span style={{ color: '#c9a96f', marginRight: '6px' }}>Роль:</span>
                <strong style={{ color: '#f8d9a6' }}>{role}</strong>
              </p>

              <p style={{ margin: 0, fontSize: '1.02rem', lineHeight: 1.35 }}>
                <span style={{ marginRight: '8px' }}>🗓️</span>
                <span style={{ color: '#c9a96f', marginRight: '6px' }}>Дата створення:</span>
                <strong style={{ color: userData.createdAt ? '#f8d9a6' : '#a58b6f' }}>
                  {userData.createdAt ? formatDate(userData.createdAt) : 'Немає даних'}
                </strong>
              </p>

              {userData.lastLogin && (
                <p style={{ margin: 0, fontSize: '1.02rem', lineHeight: 1.35 }}>
                  <span style={{ marginRight: '8px' }}>🔑</span>
                  <span style={{ color: '#c9a96f', marginRight: '6px' }}>Остання авторизація:</span>
                  <strong style={{ color: '#f8d9a6' }}>{formatDate(userData.lastLogin)}</strong>
                </p>
              )}

              {userData.updatedAt && (
                <p style={{ margin: 0, fontSize: '1.02rem', lineHeight: 1.35 }}>
                  <span style={{ marginRight: '8px' }}>✏️</span>
                  <span style={{ color: '#c9a96f', marginRight: '6px' }}>Останнє оновлення профілю:</span>
                  <strong style={{ color: '#f8d9a6' }}>{formatDate(userData.updatedAt)}</strong>
                </p>
              )}
            </div>
          </div>


          {message && (
            <p
              className="subtitle"
              style={{
                marginTop: '1rem',
                zIndex: 1,
                position: 'relative',
                color: '#705444',
              }}
            >
              {message}
            </p>
          )}
        </>
      )}

      {/* === Вкладка КОМЕНТАРІ === */}
      {activeTab === 'comments' && (
        <section
          style={{
            position: 'relative',
            zIndex: 1,
            marginTop: '1.5rem',
            color: '#f8d9a6',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginBottom: '1rem' }}>💬 Мої коментарі</h2>

          {commentsLoading ? (
            <p>⏳ Завантаження коментарів...</p>
          ) : comments.length === 0 ? (
            <p>Поки що немає коментарів</p>
          ) : (
            <>
              <p style={{ marginBottom: '0.5rem', color: '#c9a96f' }}>
                Середня оцінка: ⭐ {getAverageRating()}
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '1rem',
                }}
              >
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '1rem',
                      width: '90%',
                      maxWidth: '600px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    {comment.bookId?.coverUrl && (
                      <img
                        src={comment.bookId.coverUrl}
                        alt={comment.bookId.title}
                        style={{
                          width: 60,
                          height: 85,
                          objectFit: 'cover',
                          borderRadius: '6px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8d9a6' }}>
                        {comment.bookId?.title || 'Без назви'}
                      </h3>
                      <p style={{ margin: 0, color: '#ddd' }}>{comment.content}</p>
                      {comment.rating && (
                        <p style={{ margin: '0.3rem 0', color: '#c9a96f' }}>⭐ {comment.rating}</p>
                      )}
                      <p style={{ fontSize: '0.8rem', color: '#a58b6f' }}>
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      style={{
                        background: 'transparent',
                        color: '#ff6b6b',
                        border: '1px solid #ff6b6b',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        transition: '0.3s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff6b6b20')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      🗑 Видалити
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

