'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FavoriteTab from '@/components/FavoriteTab';

type Book = {
  _id: string;
  title: string;
  author: string;
  genre: string;
  year: number;
  description: string;
  fileUrl: string;
  coverUrl: string;
  isPremium?: boolean; // 🆕
};

type DecodedToken = {
  userId: string;
  username: string;
  role: string;
  exp: number;
};

function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // 🆕
  const [favorites, setFavorites] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 6;

  const loadUser = async () => {
    const token = localStorage.getItem('readgrid_token');
    if (!token) {
      setIsAuthorized(false);
      setUsername('');
      setRole('');
      setIsPremium(false);
      return;
    }

    try {
      const decoded = decodeJWT(token);
      if (!decoded || decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('readgrid_token');
        setIsAuthorized(false);
        setUsername('');
        setRole('');
        setIsPremium(false);
      } else {
        setUsername(decoded.username);
        setRole(decoded.role);
        setIsAuthorized(true);
        fetchFavorites(token);
        await fetchUserPremiumStatus(decoded.userId, token); // 🆕
      }
    } catch {
      setIsAuthorized(false);
      setUsername('');
      setRole('');
      setIsPremium(false);
    }
  };

  // 🆕 Перевірка Premium статусу
  const fetchUserPremiumStatus = async (userId: string, token: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsPremium(data.isPremium || false);
      }
    } catch (error) {
      console.error('Premium status error:', error);
    }
  };

  const fetchFavorites = async (token: string) => {
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites.map((book: Book) => book._id));
      }
    } catch (error) {
      console.error('Fetch favorites error:', error);
    }
  };

  const toggleFavorite = async (bookId: string) => {
    const token = localStorage.getItem('readgrid_token');
    if (!token) return;

    const isFavorite = favorites.includes(bookId);

    try {
      if (isFavorite) {
        const res = await fetch(`/api/favorites?bookId=${bookId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setFavorites(prev => prev.filter(id => id !== bookId));
        }
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookId }),
        });
        if (res.ok) {
          setFavorites(prev => [...prev, bookId]);
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  useEffect(() => {
    loadUser();

    const timestamp = new Date().getTime();
    fetch(`/api/books?t=${timestamp}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const booksData = Array.isArray(data) ? data : data.books || [];
        setBooks(booksData);
        setFilteredBooks(booksData);
      })
      .catch(() => {
        setBooks([]);
        setFilteredBooks([]);
      });
  }, []);

  useEffect(() => {
    const handleStorage = () => loadUser();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSearch = () => {
    const filtered = books.filter(book => {
      // 🆕 Фільтр premium книг
      if (book.isPremium && !isPremium) return false;

      const matchesSearch =
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGenre = genreFilter
        ? book.genre.toLowerCase().includes(genreFilter.toLowerCase())
        : true;

      const matchesYear = yearFilter
        ? book.year.toString() === yearFilter
        : true;

      return matchesSearch && matchesGenre && matchesYear;
    });

    setFilteredBooks(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, genreFilter, yearFilter, isPremium]); // 🆕 додано isPremium

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, startIndex + booksPerPage);

  const handleLogout = () => {
    localStorage.removeItem('readgrid_token');
    setIsAuthorized(false);
    setUsername('');
    setRole('');
    setIsPremium(false);
    window.location.reload();
  };

  // Canvas effect (залишається без змін)
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.id = "readgrid-web";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "-60";
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

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <canvas id="readgrid-web" className="readgrid-web"></canvas>

      {isAuthorized && <FavoriteTab />}

      {/* Фонові елементи */}
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

      {/* Навігація */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: "1200px",
          marginBottom: "2rem",
          borderBottom: "1px solid #705444",
          paddingBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/logo.png"
            alt="ReadGrid logo"
            className="logo"
            style={{
              width: 85,
              height: 85,
              borderRadius: '50%',
              boxShadow: '0 0 12px rgba(255, 208, 163, 0.4)',
              border: '2px solid #caa98a',
              objectFit: 'cover',
              backgroundColor: '#2a1e1a',
              transition: 'transform 0.4s ease, box-shadow 0.4s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 208, 163, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 208, 163, 0.4)';
            }}
          />
          <h1 style={{ fontSize: "1.8rem", color: "#f8d9a6" }}>ReadGrid 📚</h1>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {isAuthorized ? (
            <>
              <Link href="/profile" className="nav-btn">👤 Профіль</Link>
              {/* 🆕 Кнопка Premium */}
              {!isPremium && (
                <Link href="/premium" className="nav-btn" style={{ backgroundColor: "#d4a23b", color: "#fff" }}>
                  ✨ Premium
                </Link>
              )}
              {isPremium && (
                <span style={{ 
                  padding: '8px 16px', 
                  backgroundColor: 'rgba(212,162,59,0.2)', 
                  borderRadius: '8px',
                  color: '#d4a23b',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  ⭐ Premium
                </span>
              )}
              {role === 'admin' && (
                <Link href="/admin/books" className="nav-btn" style={{ backgroundColor: "#c47f5f", color: "#fff8f2" }}>
                  🛠️ Admin Books Panel
                </Link>
              )}
              <button onClick={handleLogout} className="nav-btn delete">🚪 Вийти</button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-btn">🔑 Увійти</Link>
              <Link href="/register" className="nav-btn">📝 Реєстрація</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p className="subtitle fade-in-left">
          Вітаємо у системі електронної бібліотеки!📖
        </p>
        {username && (
          <p className="subtitle fade-in-right">
            👋 Приємно бачити, {username}!
          </p>
        )}
      </div>

      {/* Фільтри */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          width: "100%",
          maxWidth: "1000px",
          marginBottom: "2rem",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Пошук за назвою або автором..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="text"
          placeholder="Жанр (наприклад: роман)"
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
        />
        <input
          type="number"
          placeholder="Рік видання"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          min={1500}
          max={new Date().getFullYear()}
        />
      </div>

      {/* Книги */}
      <section className="book-grid">
        {currentBooks.length === 0 ? (
          <p className="subtitle">📚 Нічого не знайдено</p>
        ) : (
          currentBooks.map(book => (
            <div key={book._id} className="book-card" style={{ position: 'relative' }}>
              {/* 🆕 Мітка Premium */}
              {book.isPremium && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'linear-gradient(135deg, #d4a23b 0%, #f4d03f 100%)',
                    color: '#1a1410',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(212,162,59,0.5)',
                  }}
                >
                  ⭐ Premium
                </div>
              )}

              {/* Кнопка обраного */}
              {isAuthorized && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(book._id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    border: 'none',
                    background: favorites.includes(book._id)
                      ? 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)'
                      : 'rgba(255,255,255,0.2)',
                    color: favorites.includes(book._id) ? '#fff' : '#caa98a',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={favorites.includes(book._id) ? 'Видалити з обраного' : 'Додати в обране'}
                >
                  {favorites.includes(book._id) ? '❤️' : '🤍'}
                </button>
              )}

              <img
                src={book.coverUrl || "/no-cover.png"}
                alt={`Обкладинка ${book.title}`}
                style={{
                  width: "100%",
                  height: "480px",
                  borderRadius: "10px",
                  marginBottom: "15px",
                  objectFit: "cover",
                  transition: "transform 0.4s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                }}
              />

              <h2 style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "#f8d9a6",
                marginBottom: "0.5rem",
                lineHeight: "1.3",
                textShadow: "0 0 5px rgba(248,217,166,0.3)",
              }}>
                {book.title}
              </h2>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                padding: "0.5rem 0",
                borderBottom: "1px solid rgba(112,84,68,0.3)",
              }}>
                <span style={{ color: "#caa98a", fontSize: "1rem", fontWeight: 500 }}>
                  ✍️ {book.author}
                </span>
                <span style={{ color: "#a07e65", fontSize: "0.9rem" }}>•</span>
                <span style={{ color: "#a07e65", fontSize: "0.95rem", fontStyle: "italic" }}>
                  📅 {book.year}
                </span>
              </div>

              <div style={{
                display: "inline-block",
                padding: "0.4rem 0.9rem",
                backgroundColor: "rgba(112,84,68,0.25)",
                borderRadius: "20px",
                border: "1px solid rgba(112,84,68,0.4)",
                marginBottom: "0.75rem",
              }}>
                <p style={{
                  color: "#d8b991",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  🏷️ {book.genre}
                </p>
              </div>

              <p style={{
                color: "#b09378",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                marginBottom: "1rem",
                fontStyle: "italic",
              }}>
                {book.description?.slice(0, 80)}...
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "1rem" }}>
                <Link href={`/books/${book._id}`} className="read-btn">📖 Детальніше</Link>
                {isAuthorized ? (
                  book.isPremium && !isPremium ? (
                    <Link href="/premium" className="read-btn" style={{ background: '#d4a23b' }}>
                      ⭐ Отримати Premium
                    </Link>
                  ) : (
                    <a href={book.fileUrl} target="_blank" rel="noopener noreferrer" className="read-btn">📥 Завантажити</a>
                  )
                ) : (
                  <p style={{
                    color: "#8b6b57",
                    fontStyle: "italic",
                    fontSize: "0.9rem",
                    padding: "0.5rem",
                    backgroundColor: "rgba(112,84,68,0.1)",
                    borderRadius: "6px",
                  }}>
                    🔒 Увійдіть, щоб скачати
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Пагінація */}
      {totalPages > 1 && (
        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: "10px" }}>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #705444",
                background: currentPage === index + 1 ? "#705444" : "transparent",
                color: currentPage === index + 1 ? "#f8d9a6" : "#caa98a",
                cursor: "pointer",
                transition: "0.3s",
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      <footer
        style={{
          marginTop: "4rem",
          textAlign: "center",
          color: "#a07e65",
          borderTop: "1px solid #705444",
          paddingTop: "1rem",
          width: "70%",
          maxWidth: "none",
        }}
      >
        <p>© 2025 ReadGrid — Інтелектуальна система електронної бібліотеки</p>
      </footer>
    </div>
  );
}
