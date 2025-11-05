// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { verifyToken, signToken } from '@/lib/jwt'; // 🔥 додано signToken
import validator from 'validator';

function getTokenUserId(decoded: any): string | null {
  if (!decoded) return null;
  return decoded.userId || decoded.id || decoded._id || null;
}

// GET /api/users/:id
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Missing token' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 403 });

    const { id } = await params;

    const tokenUserId = getTokenUserId(decoded);
    if (!tokenUserId || tokenUserId !== id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findById(id).select('-password -__v');
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    console.error('GET /api/users/[id] error:', err);
    return NextResponse.json({ message: 'Database connection error' }, { status: 500 });
  }
}

// PUT /api/users/:id
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Missing token' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 403 });

    const { id } = await params;

    const tokenUserId = getTokenUserId(decoded);
    if (!tokenUserId || tokenUserId !== id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { username, email, password } = body;

    const updates: any = {};

    if (username !== undefined) {
      if (!username || username.length < 3)
        return NextResponse.json({ message: 'Username too short' }, { status: 400 });
      updates.username = username;
    }

    if (email !== undefined) {
      if (!validator.isEmail(email)) 
        return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
      updates.email = email.toLowerCase();
    }

    if (password !== undefined && password !== '') {
      if (password.length < 6) 
        return NextResponse.json({ message: 'Password too short' }, { status: 400 });
      updates.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes provided' }, { status: 400 });
    }

    if (updates.username) {
      const exists = await User.findOne({ username: updates.username, _id: { $ne: id } });
      if (exists) return NextResponse.json({ message: 'Username already taken' }, { status: 409 });
    }
    if (updates.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (exists) return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password -__v');
    if (!updatedUser) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    // 🔥 Генеруємо новий токен з оновленими даними
    const newToken = signToken({
      userId: String(updatedUser._id),
      username: updatedUser.username,
      role: updatedUser.role,
      email: updatedUser.email,
    });

    return NextResponse.json({ 
      message: 'Profile successfully updated', 
      user: updatedUser,
      token: newToken // 🔥 повертаємо новий токен
    });
  } catch (err) {
    console.error('PUT /api/users/[id] error:', err);
    return NextResponse.json({ message: 'Database connection error' }, { status: 500 });
  }
}