import jwt from 'jsonwebtoken';

export function verifyAdmin(authHeader?: string): { isAdmin: boolean; error?: string } {
    if (!authHeader) {
        return { isAdmin: false, error: 'Missing token' };
    }

    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        if (typeof decoded === 'object' && decoded.role === 'admin') {
            return { isAdmin: true };
        } else {
            return { isAdmin: false, error: 'Access denied: Admins only' };
        }
    } catch {
        return { isAdmin: false, error: 'Invalid token' };
    }
}
