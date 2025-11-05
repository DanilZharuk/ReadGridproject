// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
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
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        premiumUntil: user.premiumUntil,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    }, { status: 200 });

  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    return NextResponse.json({ message: 'Error fetching profile' }, { status: 500 });
  }
}