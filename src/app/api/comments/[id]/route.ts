// src/app/api/comments/[id]/route.ts
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import '@/models/User'; // 🔥 Side-effect import для реєстрації моделі User
import Book from '@/models/Book';
import Rating from '@/models/Rating';
import Comment from '@/models/Comment';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

// DELETE /api/comments/:id
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // 🔥 NextJS 15: params є Promise
) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payload: any = verifyToken(token);
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 🔥 NextJS 15: await params
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid comment id" }, { status: 400 });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found" }, { status: 404 });
    }

    // 🔥 Перевірка прав: власник коментаря АБО адмін
    const isOwner = comment.userId.toString() === payload.userId;
    const isAdmin = payload.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: "No permission to delete" }, { status: 403 });
    }

    // Зберігаємо дані ДО видалення
    const bookId = comment.bookId;
    const userId = comment.userId;
    const hadRating = comment.rating !== undefined && comment.rating !== null;

    // Видаляємо коментар
    await Comment.findByIdAndDelete(id);

    // 🔥 Якщо коментар мав оцінку - видаляємо Rating і пересчитовуємо рейтинг книги
    if (hadRating) {
      await Rating.findOneAndDelete({ 
        userId: userId, 
        bookId: bookId 
      });

      // Пересчитуємо середній рейтинг
      const agg = await Rating.aggregate([
        { $match: { bookId: new mongoose.Types.ObjectId(bookId.toString()) } },
        { $group: { _id: "$bookId", avg: { $avg: "$value" }, count: { $sum: 1 } } },
      ]);

      const avg = agg[0]?.avg ?? 0;
      const count = agg[0]?.count ?? 0;

      await Book.findByIdAndUpdate(bookId, {
        $set: { 
          avgRating: count > 0 ? Math.round(avg * 100) / 100 : 0, 
          ratingsCount: count 
        },
      });

      console.log(`✅ Рейтинг оновлено: avg=${avg}, count=${count}`);
    }

    return NextResponse.json({ message: "Comment deleted" }, { status: 200 });
    
  } catch (err: any) {
    console.error('DELETE /api/comments/[id] error:', err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}

// PATCH: toggle hidden (admin only)
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // 🔥 NextJS 15
) {
  try {
    await dbConnect();
    
    // 🔥 NextJS 15: await params
    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid comment id' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const payload: any = verifyToken(token);
    
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    const { hidden } = body ?? {};
    
    if (typeof hidden !== 'boolean') {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    const updated = await Comment.findByIdAndUpdate(
      id, 
      { $set: { hidden } }, 
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: hidden ? 'Comment hidden' : 'Comment visible', 
      comment: updated 
    }, { status: 200 });
    
  } catch (err: any) {
    console.error('PATCH /api/comments/[id] error:', err);
    return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
  }
}