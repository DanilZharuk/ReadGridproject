// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'client' | 'admin';
  favorites: mongoose.Types.ObjectId[];
  createdAt: Date;
  lastLogin?: Date; // 🆕 ДОДАЙ ЦЕ
  isPremium: boolean; // 🆕 ДОДАНО
  premiumUntil?: Date; // 🆕 ДОДАНО (коли закінчиться преміум)
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'client' },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    isPremium: { type: Boolean, default: false }, // 🆕
    premiumUntil: { type: Date }, // 🆕
  },
  { versionKey: false, timestamps: true }
);

// ❗ ВАЖЛИВО: очищуємо кешовану модель перед перевизначенням
const User = (mongoose.models.User ??
  mongoose.model<IUser>('User', UserSchema)) as Model<IUser>;

export default User;
