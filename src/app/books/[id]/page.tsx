'use client';
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import CommentsSection from '@/components/CommentsSection/CommentsSection';

type Book = {
    _id: string;
    title: string;
    author: string;
    genre: string;
    year: number;
    description: string;
    coverUrl: string;
    fileUrl: string;
    isPremium?: boolean; // 🆕
};

type DecodedToken = {
    userId: string;
    username: string;
    role: string;
    exp: number;
};

export default function BookDetailsPage() {
    const { id } = useParams();
    const [book, setBook] = useState<Book | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [username, setUsername] = useState("");
    const [role, setRole] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPremium, setIsPremium] = useState(false); // 🆕
    const [userId, setUserId] = useState<string | null>(null); // 🆕

    useEffect(() => {
        const token = localStorage.getItem("readgrid_token");
        if (token) {
            try {
                const decoded = jwtDecode<DecodedToken>(token);
                if (decoded.exp * 1000 > Date.now()) {
                    setIsAuthorized(true);
                    setUsername(decoded.username);
                    setRole(decoded.role);
                    setUserId(decoded.userId); // 🆕
                    checkFavorite(token);
                    fetchUserPremiumStatus(decoded.userId, token); // 🆕
                } else {
                    localStorage.removeItem("readgrid_token");
                }
            } catch {
                setIsAuthorized(false);
            }
        }
    }, []);

    const checkFavorite = async (token: string) => {
        try {
            const res = await fetch('/api/favorites', {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
            });

            if (res.ok) {
                const data = await res.json();
                const favoriteIds = data.favorites.map((book: Book) => book._id);
                setIsFavorite(favoriteIds.includes(id));
            }
        } catch (error) {
            console.error('Check favorite error:', error);
        }
    };

    // 🆕 Перевірка Premium статусу користувача
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

    const toggleFavorite = async () => {
        const token = localStorage.getItem("readgrid_token");
        if (!token) return;

        try {
            if (isFavorite) {
                const res = await fetch(`/api/favorites?bookId=${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setIsFavorite(false);
                }
            } else {
                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ bookId: id }),
                });
                if (res.ok) {
                    setIsFavorite(true);
                }
            }
        } catch (error) {
            console.error('Toggle favorite error:', error);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetch(`/api/books/${id}`)
            .then((res) => res.json())
            .then((data) => {
                if (data && data._id) setBook(data);
                else setBook(null);
            })
            .catch(() => setBook(null));
    }, [id]);

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

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const mouse = { x: width / 2, y: height / 2, radius: 120 };

        window.addEventListener("resize", () => {
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
                phase: Math.random() * Math.PI * 2,
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
                        const alpha =
                            0.05 +
                            (1 - dist / 160) * 0.15 +
                            0.05 * Math.sin(p1.phase + Date.now() * 0.002);
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
        window.addEventListener("mousemove", onMouseMove);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            canvas.remove();
        };
    }, []);

    if (!book) {
        return (
            <div style={{ textAlign: "center", marginTop: "4rem", color: "#caa98a" }}>
                <p>⏳ Завантаження книги...</p>
            </div>
        );
    }

    return (
        <div className="page" style={{ position: "relative", overflow: "hidden", padding: "2rem" }}>
            <canvas id="readgrid-web" className="readgrid-web"></canvas>

            <Link href="/" className="nav-btn" style={{ marginBottom: "1.5rem", display: "inline-block" }}>
                ⬅️ На головну
            </Link>

            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "2rem",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    position: 'relative',
                }}
            >
                <div style={{ position: 'relative' }}>
                    <img
                        src={book.coverUrl}
                        alt={book.title}
                        style={{
                            width: "300px",
                            height: "460px",
                            borderRadius: "12px",
                            objectFit: "cover",
                            boxShadow: "0 0 15px rgba(0,0,0,0.3)",
                        }}
                    />

                    {/* 🆕 Мітка Premium на обкладинці */}
                    {book.isPremium && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                background: 'linear-gradient(135deg, #d4a23b 0%, #f4d03f 100%)',
                                color: '#1a1410',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                zIndex: 10,
                                boxShadow: '0 4px 12px rgba(212,162,59,0.6)',
                            }}
                        >
                            ⭐ Premium
                        </div>
                    )}

                    {/* 🔥 Кнопка обраного на обкладинці */}
                    {isAuthorized && (
                        <button
                            onClick={toggleFavorite}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                border: 'none',
                                background: isFavorite
                                    ? 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)'
                                    : 'rgba(255,255,255,0.3)',
                                color: isFavorite ? '#fff' : '#caa98a',
                                fontSize: '1.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={isFavorite ? 'Видалити з обраного' : 'Додати в обране'}
                        >
                            {isFavorite ? '❤️' : '🤍'}
                        </button>
                    )}

                </div>

                <div style={{ maxWidth: "600px" }}>
                    <h1 style={{ color: "#f8d9a6", fontSize: "2rem" }}>{book.title}</h1>
                    <p style={{ color: "#caa98a", fontSize: "1.1rem" }}>
                        ✍️ Автор: <strong>{book.author}</strong>
                    </p>
                    <p style={{ color: "#caa98a" }}>📚 Жанр: {book.genre}</p>
                    <p style={{ color: "#caa98a" }}>📅 Рік видання: {book.year}</p>
                    <p style={{ marginTop: "1rem", color: "#d8c3a5", lineHeight: "1.6" }}>{book.description}</p>

                    {typeof (book as any).avgRating === 'number' && (book as any).ratingsCount > 0 ? (
                        <p style={{ color: "#f8d9a6", fontWeight: 600 }}>
                            ⭐ Середній рейтинг: {(book as any).avgRating.toFixed(1)} / 5 ({(book as any).ratingsCount} оцінок)
                        </p>
                    ) : (
                        <p style={{ color: "#a07e65" }}>⭐ Ще немає оцінок</p>
                    )}

                    <div style={{ marginTop: "2rem", display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {isAuthorized ? (
                            <>
                                {/* 🆕 Перевірка Premium для завантаження */}
                                {book.isPremium && !isPremium ? (
                                    <Link
                                        href="/premium"
                                        className="read-btn"
                                        style={{
                                            backgroundColor: "#d4a23b",
                                            color: "#fff",
                                            padding: "10px 18px",
                                            borderRadius: "8px",
                                            textDecoration: "none",
                                            display: "inline-block",
                                        }}
                                    >
                                        ⭐ Отримати Premium для завантаження
                                    </Link>
                                ) : (
                                    <a
                                        href={book.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="read-btn"
                                        style={{
                                            backgroundColor: "#705444",
                                            color: "#f8d9a6",
                                            padding: "10px 18px",
                                            borderRadius: "8px",
                                        }}
                                    >
                                        📥 Завантажити книгу
                                    </a>
                                )}

                                <button
                                    onClick={toggleFavorite}
                                    className="read-btn"
                                    style={{
                                        backgroundColor: isFavorite ? "#ff6b6b" : "#705444",
                                        color: "#f8d9a6",
                                        padding: "10px 18px",
                                        borderRadius: "8px",
                                    }}
                                >
                                    {isFavorite ? '💔 Видалити з обраного' : '❤️ Додати в обране'}
                                </button>
                            </>
                        ) : (
                            <p style={{ color: "#caa98a", fontStyle: "italic" }}>
                                🔒 Увійдіть, щоб завантажити файл та додати в обране
                            </p>
                        )}
                    </div>
                </div>
            </div>


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
                    opacity: 0.12,
                    filter: 'blur(0.4px) brightness(1.1)',
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
                    opacity: 0.12,
                    filter: 'blur(0.4px) brightness(1.1)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            <section
                style={{
                    marginTop: "4rem",
                    padding: "2.5rem",
                    backgroundColor: "rgba(52, 40, 34, 0.65)",
                    borderRadius: "20px",
                    border: "1px solid rgba(112, 84, 68, 0.35)",
                    boxShadow: "0 0 30px rgba(0, 0, 0, 0.4)",
                    position: "relative",
                    zIndex: 2,
                    width: "100%",
                    maxWidth: "1400px",
                    marginLeft: "auto",
                    marginRight: "auto",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        marginBottom: "1.8rem",
                    }}
                >
                    <span style={{ fontSize: "1.8rem" }}>💬</span>
                    <h2
                        style={{
                            color: "#f8d9a6",
                            fontSize: "1.8rem",
                            fontWeight: 600,
                            textShadow: "0 0 4px rgba(248, 217, 166, 0.4)",
                        }}
                    >
                        Відгуки та коментарі читачів
                    </h2>
                </div>

                <p
                    style={{
                        color: "#a07e65",
                        fontSize: "1.1rem",
                        marginBottom: "1.5rem",
                        lineHeight: "1.6",
                        fontStyle: "italic",
                        textAlign: "center",
                    }}
                >
                    Поділися своїми враженнями від книги або прочитай, що думають інші 📖
                </p>

                <div
                    style={{
                        backgroundColor: "rgba(27, 20, 17, 0.65)",
                        borderRadius: "16px",
                        padding: "2rem",
                        border: "1px solid rgba(112, 84, 68, 0.3)",
                        boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.3)",
                    }}
                >
                    <CommentsSection bookId={book._id} />
                </div>
            </section>
        </div>
    );
}