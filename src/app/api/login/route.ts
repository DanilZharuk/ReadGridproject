import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import { signToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return NextResponse.json({ message: 'Authorization failed' }, { status: 401 });

    // 🔥 Оновлюємо lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = signToken({
      userId: String(user._id), // 🩵 безпечне приведення
      username: user.username,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Authorization failed' }, { status: 500 });
  }
}