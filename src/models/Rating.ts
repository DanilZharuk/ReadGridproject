// src/models/Rating.ts
import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IRating extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  value: number; // 1..5
  createdAt?: Date;
  updatedAt?: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

// один користувач — один рейтинг на книгу
RatingSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Rating = models.Rating || model<IRating>('Rating', RatingSchema);
export default Rating;
