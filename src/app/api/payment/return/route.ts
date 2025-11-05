// src/app/api/payment/return/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 🔥 DEV режим: якщо true, будь-яка оплата вважається успішною
const DEV_MODE = process.env.NODE_ENV === 'development';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const transactionStatus = formData.get('transactionStatus') as string;
    const orderReference = formData.get('orderReference') as string;
    const reasonCode = formData.get('reasonCode') as string;
    
    console.log('🔙 User returned after payment (POST):', {
      transactionStatus,
      orderReference,
      reasonCode,
      allData: Object.fromEntries(formData)
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // 🔥 Перевіряємо статус транзакції
    let isSuccess = transactionStatus === 'Approved';
    
    // 🔥 ТІЛЬКИ в DEV режимі емулюємо успіх для тестового шлюзу
    if (DEV_MODE && reasonCode === '1122' && transactionStatus === 'Declined') {
      console.log('⚠️ DEV MODE: Gate Declined detected, but treating as SUCCESS for testing');
      isSuccess = true;
      
      // Викликаємо callback вручну для оновлення користувача
      try {
        const callbackUrl = `${protocol}://${host}/api/payment/callback`;
        // 🔥 НЕ надсилаємо merchantSignature з форми - callback сам перевірить підпис
        const callbackData = {
          merchantAccount: formData.get('merchantAccount'),
          orderReference: orderReference,
          amount: formData.get('amount'),
          currency: formData.get('currency'),
          authCode: 'DEV_TEST_' + Date.now(),
          cardPan: formData.get('cardPan'),
          transactionStatus: 'Approved', // ✅ Емулюємо успішний статус
          reasonCode: '1'
        };
        
        console.log('📤 Sending manual callback in DEV mode...');
        
        await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callbackData)
        });
        
        console.log('✅ Manual callback sent successfully');
      } catch (callbackError) {
        console.error('❌ Failed to send manual callback:', callbackError);
      }
    }
    
    const redirectPath = isSuccess ? '/payment/success' : '/payment/error';
    const redirectUrl = `${protocol}://${host}${redirectPath}`;

    console.log(`✅ Redirecting to: ${redirectUrl}`);

    return new NextResponse(
      `<head>
          <meta charset="utf-8">
          <title>Перенаправлення...</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
        </head>
        <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #1a1410 0%, #2a1e1a 100%); color: #f8d9a6;">
          <div style="text-align: center;">
            <div style="border: 4px solid rgba(248, 217, 166, 0.1); border-radius: 50%; border-top: 4px solid #f8d9a6; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p>Перенаправлення...</p>
            ${DEV_MODE && reasonCode === '1122' ? '<p style="margin-top: 20px; padding: 10px; background: rgba(212, 162, 59, 0.2); border-radius: 8px;">🔧 DEV MODE: Емуляція успішної оплати</p>' : ''}
          </div>
          <script>
            window.location.href = '${redirectUrl}';
          </script>
        </body>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error in payment return POST:', error);
    
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const errorUrl = `${protocol}://${host}/payment/error`;
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Помилка</title>
          <meta http-equiv="refresh" content="0;url=${errorUrl}">
        </head>
        <body>
          <script>
            window.location.href = '${errorUrl}';
          </script>
          <p>Перенаправлення...</p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const transactionStatus = url.searchParams.get('transactionStatus');
    const orderReference = url.searchParams.get('orderReference');
    
    console.log('🔙 User returned after payment (GET):', {
      transactionStatus,
      orderReference
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const isSuccess = transactionStatus === 'Approved';
    const redirectPath = isSuccess ? '/payment/success' : '/payment/error';
    const redirectUrl = new URL(redirectPath, `${protocol}://${host}`);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Error in payment return GET:', error);
    
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const errorUrl = new URL('/payment/error', `${protocol}://${host}`);
    
    return NextResponse.redirect(errorUrl);
  }
}