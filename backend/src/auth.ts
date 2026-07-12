import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './index';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const generateToken = (userId: string, role: string, tokenVersion: number) => {
  return jwt.sign({ userId, role, tokenVersion }, JWT_SECRET, { expiresIn: '24h' });
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string, tokenVersion: number };
    
    // Fetch user to verify token version
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Please login again.' });
    }

    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const isCCRB = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'CCRB') {
    return res.status(403).json({ error: 'CCRB access required' });
  }
  next();
};

export const isOversight = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.role;
  if (role !== 'ADMIN' && role !== 'CCRB') {
    return res.status(403).json({ error: 'Unauthorized oversight access' });
  }
  next();
};
