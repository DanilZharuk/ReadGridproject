import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Comment from '@/models/Comment';
import { verifyToken } from '@/lib/jwt';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Missing token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const { id } = await params;

    // Користувач може бачити тільки свої коментарі (або адмін - всі)
    const tokenUserId = decoded.userId || decoded.id;
    if (decoded.role !== 'admin' && tokenUserId !== id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Отримуємо всі коментарі користувача з інформацією про книги
    const comments = await Comment.find({ userId: id })
      .populate('bookId', 'title coverUrl')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ comments });
  } catch (err) {
    console.error('GET /api/users/[id]/comments error:', err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}