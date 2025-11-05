// src/models/Comment.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  content: string;
  rating?: number;
  hidden?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    content: { type: String, required: true, minlength: 3, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5, required: false },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🔥 Правильний експорт з перевіркою існуючої моделі
export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);