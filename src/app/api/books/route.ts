// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Book from '@/models/Book';
import { verifyToken } from '@/lib/jwt';

// GET - отримати всі книги
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const books = await Book.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ books }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Database error', error: error.message }, { status: 500 });
  }
}

// POST - додати нову книгу (тільки admin)
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const payload: any = verifyToken(token);
    
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, author, genre, year, description, coverUrl, fileUrl, isPremium } = body;

    if (!title || !author || !genre || !year || !description || !coverUrl || !fileUrl) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    if (typeof year !== 'number' || year < 1500 || year > currentYear) {
      return NextResponse.json({ 
        message: `Invalid year. Must be between 1500 and ${currentYear}` 
      }, { status: 400 });
    }

    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(coverUrl) || !urlRegex.test(fileUrl)) {
      return NextResponse.json({ message: 'Invalid file URL' }, { status: 400 });
    }

    const existingBook = await Book.findOne({ title, author });
    if (existingBook) {
      return NextResponse.json({ 
        message: 'Book with this title and author already exists' 
      }, { status: 409 });
    }

    const newBook = new Book({ 
      title, 
      author, 
      genre, 
      year, 
      description, 
      coverUrl, 
      fileUrl,
      isPremium: isPremium || false // 🆕
    });
    
    await newBook.save();

    return NextResponse.json({ 
      message: 'Book successfully added', 
      book: newBook 
    }, { status: 201 });

  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ 
        message: 'Book with this title and author already exists' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ message: 'Database error', error: error.message }, { status: 500 });
  }
}