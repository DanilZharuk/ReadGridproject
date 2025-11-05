// src/app/api/payment/demo-activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Missing token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    await dbConnect();

    const userId = decoded.userId || decoded.id;
    const { plan } = await req.json();

    // Визначаємо тривалість преміуму
    const isPremiumYearly = plan === 'yearly';
    const premiumDuration = isPremiumYearly ? 365 : 30; // днів
    
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + premiumDuration);

    // Оновлюємо користувача
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isPremium: true,
        premiumUntil,
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    console.log(`✅ [DEMO] Premium activated for user ${userId} until ${premiumUntil}`);

    return NextResponse.json({ 
      success: true,
      message: 'Premium activated successfully',
      premiumUntil,
      plan
    });

  } catch (err) {
    console.error('Demo activation error:', err);
    return NextResponse.json({ message: 'Error activating premium' }, { status: 500 });
  }
}