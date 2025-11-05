// src/app/api/books/[id]/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Book from "@/models/Book";
import { verifyToken } from "@/lib/jwt";

// GET - отримати книгу за ID
export async function GET(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: "Missing book ID" }, { status: 400 });
    }

    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(book, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching book:", error);
    return NextResponse.json({ message: "Database error", error: error.message }, { status: 500 });
  }
}

// PUT - оновити книгу (тільки admin)
export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payload: any = verifyToken(token);
    
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Access denied. Admin only." }, { status: 403 });
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: "Missing book ID" }, { status: 400 });
    }

    const body = await req.json();
    const { title, author, genre, year, description, coverUrl, fileUrl, isPremium } = body;

    if (!title || !author || !genre || !year || !description || !coverUrl || !fileUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    if (typeof year !== 'number' || year < 1500 || year > currentYear) {
      return NextResponse.json({ 
        message: `Invalid year. Must be between 1500 and ${currentYear}` 
      }, { status: 400 });
    }

    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(coverUrl) || !urlRegex.test(fileUrl)) {
      return NextResponse.json({ message: "Invalid file URL" }, { status: 400 });
    }

    const existingBook = await Book.findById(id);
    if (!existingBook) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { title, author, genre, year, description, coverUrl, fileUrl, isPremium: isPremium || false }, // 🆕
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      message: "Book successfully updated", 
      book: updatedBook 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating book:", error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        message: "Book with this title and author already exists" 
      }, { status: 409 });
    }
    
    return NextResponse.json({ message: "Database error", error: error.message }, { status: 500 });
  }
}

// DELETE - видалити книгу (тільки admin)
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payload: any = verifyToken(token);
    
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Access denied. Admin only." }, { status: 403 });
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: "Missing book ID" }, { status: 400 });
    }

    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    await Book.findByIdAndDelete(id);

    return NextResponse.json({ 
      message: "Book successfully deleted" 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting book:", error);
    return NextResponse.json({ message: "Database error", error: error.message }, { status: 500 });
  }
}