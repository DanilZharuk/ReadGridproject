import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'readgrid_secret_key_2025';

export function signToken(payload: {
  userId: string;
  username: string;
  role: string;
  email: string;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
