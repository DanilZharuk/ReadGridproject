// src/app/api/subscription/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Перевірка токену
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Missing token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const userId = decoded.userId || decoded.id;

    // Знаходимо користувача
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Перевіряємо чи є активна підписка
    if (!user.isPremium) {
      return NextResponse.json({ message: 'No active subscription' }, { status: 400 });
    }

    // Скасовуємо Premium
    user.isPremium = false;
    user.premiumUntil = undefined;
    await user.save();

    console.log(`✅ Premium subscription cancelled for user ${userId}`);

    return NextResponse.json({ 
      message: 'Subscription successfully cancelled',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPremium: user.isPremium
      }
    }, { status: 200 });

  } catch (err) {
    console.error('❌ Subscription cancellation error:', err);
    return NextResponse.json({ message: 'Error cancelling subscription' }, { status: 500 });
  }
}