// src/app/api/comments/route.ts
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import '@/models/User'; // 🔥 Side-effect import для реєстрації моделі User в Mongoose
import Book from '@/models/Book';
import Rating from '@/models/Rating';
import Comment from '@/models/Comment';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

const BANNED_WORDS = ['badword1', 'badword2', 'fuck', 'shit'];

function stripHtml(input = '') {
  return input.replace(/<\/?[^>]+(>|$)/g, '');
}

function containsBannedWord(text: string) {
  const t = text.toLowerCase();
  return BANNED_WORDS.some(w => t.includes(w));
}

// GET: /api/comments?bookId=...
export async function GET(req: Request) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const bookId = url.searchParams.get('bookId');
    if (!bookId) {
      return NextResponse.json({ message: 'Missing bookId' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ message: 'Invalid bookId' }, { status: 400 });
    }

    const comments = await Comment.find({ bookId, hidden: { $ne: true } })
      .sort({ createdAt: -1 })
      .populate('userId', 'username')
      .lean();

    return NextResponse.json({ comments }, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/comments error:', err);
    return NextResponse.json({ message: 'Database error', error: err.message }, { status: 500 });
  }
}

// POST: create comment (requires auth)
export async function POST(req: Request) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payload: any = verifyToken(token);
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { bookId, commentText, rating } = await req.json();

    if (!bookId || !commentText) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ message: "Invalid bookId" }, { status: 400 });
    }

    const clean = stripHtml(String(commentText)).trim();
    
    if (clean.length < 3 || clean.length > 1000) {
      return NextResponse.json({ message: "Invalid comment length (3-1000 chars)" }, { status: 400 });
    }

    if (containsBannedWord(clean)) {
      return NextResponse.json({ message: "Forbidden words detected" }, { status: 400 });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    // 🔥 ВАЖЛИВО: користувач може залишити БАГАТО коментарів, але лише ОДИН з оцінкою
    let ratingValue: number | undefined;
    
    // Перевіряємо чи користувач вже ставив оцінку цій книзі
    const existingRating = await Rating.findOne({ bookId, userId: payload.userId });
    
    if (rating !== undefined && rating !== null && rating !== "") {
      if (existingRating) {
        // Користувач вже ставив оцінку - ігноруємо нову оцінку, але коментар додаємо
        console.log('⚠️ User already rated this book, ignoring new rating');
      } else {
        // Користувач ще не ставив оцінку - додаємо
        const r = Number(rating);
        if (Number.isNaN(r) || r < 1 || r > 5) {
          return NextResponse.json({ message: "Invalid rating (1-5)" }, { status: 400 });
        }

        ratingValue = Math.round(r);
        
        await Rating.create({ 
          userId: payload.userId, 
          bookId: bookId, 
          value: ratingValue 
        });

        // Пересчитуємо середній рейтинг книги
        const agg = await Rating.aggregate([
          { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
          { $group: { _id: "$bookId", avg: { $avg: "$value" }, count: { $sum: 1 } } },
        ]);
        
        const avg = agg[0]?.avg ?? 0;
        const count = agg[0]?.count ?? 0;
        
        await Book.findByIdAndUpdate(bookId, {
          $set: { avgRating: Math.round(avg * 100) / 100, ratingsCount: count },
        });
      }
    }

    // Створюємо коментар
    const commentData: any = {
      userId: new mongoose.Types.ObjectId(payload.userId),
      bookId: new mongoose.Types.ObjectId(bookId),
      content: clean,
      hidden: false
    };

    // Додаємо rating тільки якщо він був створений
    if (ratingValue !== undefined) {
      commentData.rating = ratingValue;
    }

    const newComment = await Comment.create(commentData);

    // Отримуємо коментар з username
    const populatedComment = await Comment.findById(newComment._id)
      .populate('userId', 'username')
      .lean();

    return NextResponse.json(
      { message: "Comment added", comment: populatedComment },
      { status: 201 }
    );

  } catch (err: any) {
    console.error('POST /api/comments error:', err);
    return NextResponse.json({ 
      message: "Server error", 
      error: err.message 
    }, { status: 500 });
  }
}