// src/app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import crypto from 'crypto';

const WAYFORPAY_SECRET = process.env.WAYFORPAY_SECRET || 'flk3409refn54t54t*FNJRET';
const DEV_MODE = process.env.NODE_ENV === 'development'; // 🆕

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const data = await req.json();
    
    console.log('📥 Received WayForPay callback:', data);

    // 🔥 В DEV режимі пропускаємо перевірку підпису
    if (!DEV_MODE) {
      // Перевіряємо підпис WayForPay тільки в продакшені
      const signString = [
        data.merchantAccount,
        data.orderReference,
        data.amount,
        data.currency,
        data.authCode,
        data.cardPan,
        data.transactionStatus,
        data.reasonCode
      ].join(';');

      const expectedSignature = crypto
        .createHmac('md5', WAYFORPAY_SECRET)
        .update(signString)
        .digest('hex');

      if (data.merchantSignature !== expectedSignature) {
        console.error('❌ Invalid signature');
        return NextResponse.json({ 
          orderReference: data.orderReference, 
          status: 'decline', 
          time: Date.now() 
        });
      }
    } else {
      console.log('⚠️ DEV MODE: Skipping signature validation');
    }

    // Якщо платіж успішний
    if (data.transactionStatus === 'Approved') {
      const parts = data.orderReference.split('_');
      const userId = parts[1];
      
      console.log('✅ Payment approved for user:', userId);
      
      const isPremiumYearly = parseFloat(data.amount) >= 999;
      const premiumDuration = isPremiumYearly ? 365 : 30;
      
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + premiumDuration);

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          isPremium: true,
          premiumUntil,
        },
        { new: true }
      );

      if (updatedUser) {
        console.log(`✅ Premium activated for user ${userId} until ${premiumUntil}`);
      } else {
        console.error(`❌ User ${userId} not found`);
      }
    } else {
      console.log('⚠️ Payment not approved:', data.transactionStatus);
    }

    return NextResponse.json({ 
      orderReference: data.orderReference, 
      status: 'accept', 
      time: Date.now() 
    });
  } catch (err) {
    console.error('❌ Payment callback error:', err);
    
    return NextResponse.json({ 
      orderReference: 'error', 
      status: 'decline', 
      time: Date.now() 
    });
  }
}