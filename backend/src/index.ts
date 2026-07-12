import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import { generateToken, authenticate, isAdmin, isCCRB, isOversight } from './auth';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(cors());
const server = http.createServer(app);

// Create media directory if it doesn't exist
const mediaDir = path.join(process.cwd(), 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Serve media folder statically
app.use('/media', express.static(mediaDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

export const prisma = new PrismaClient();

const createLog = async (userId: string, action: string, details?: string) => {
  try {
    const log = await prisma.log.create({
      data: { userId, action, details },
      include: { user: { select: { name: true, email: true, role: true } } }
    });
    // Broadcast to all admins
    io.emit('new_log', log);
  } catch (err) {
    console.error('Failed to create log:', err);
  }
};

app.use(express.json());

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join_form', (formId) => {
    socket.join(formId);
    console.log(`User joined form room: ${formId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Health check for uptime monitors (like cron-job.org)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'active', timestamp: new Date() });
});

// Auth routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user.id, user.role, user.tokenVersion);
    await createLog(user.id, 'LOGIN', `User ${user.email} logged in`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// File upload route - Cloudinary Hosted
// File upload route - Cloudinary Hosted
app.post('/api/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const isPDF = req.file.mimetype === 'application/pdf';
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'police_forms',
      resource_type: isPDF ? 'raw' : 'auto',
      access_mode: 'public'
    });
    // Delete local file after successful cloud upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.json({ url: result.secure_url, filename: result.public_id, originalName: req.file.originalname });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    res.status(500).json({ error: 'Cloud upload failed' });
  }
});

app.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, email: true, name: true, role: true }
    });
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Admin routes
app.get('/api/admin/users', authenticate, isOversight, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/logs', authenticate, isOversight, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.log.findMany({
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.get('/api/logs', authenticate, isOversight, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.log.findMany({
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// User Management Routes
app.get('/api/admin/manage-users', authenticate, isOversight, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/manage-users', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role }
    });
    await createLog((req as any).user.userId, 'CREATED_USER', `Created user ${email}`);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/manage-users/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;
  try {
    const data: any = { email, name, role };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
      data.tokenVersion = { increment: 1 }; // Invalidate existing sessions on password change
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });
    await createLog((req as any).user.userId, 'UPDATED_USER', `Updated user ${email}`);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/manage-users/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    await createLog((req as any).user.userId, 'DELETED_USER', `Deleted user ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Export Routes
app.get('/api/admin/export-data', authenticate, isOversight, async (req: Request, res: Response) => {
  const { startDate, endDate, formId, respondentId } = req.query;
  try {
    const where: any = {};
    if (formId) where.formId = formId as string;
    if (respondentId) where.respondentId = respondentId as string;
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate as string);
      if (endDate) where.submittedAt.lte = new Date(endDate as string);
    }

    const responses = await prisma.response.findMany({
      where,
      include: {
        form: { select: { title: true, schema: true } },
        respondent: { select: { name: true, email: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

app.post('/api/admin/log-export', authenticate, isOversight, async (req: Request, res: Response) => {
  const { formId, count } = req.body;
  const user = (req as any).user;
  try {
    await createLog(user.userId, 'DATA_EXPORTED', `Exported ${count} records for ${formId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log export' });
  }
});

app.get('/api/responses/my-history', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const responses = await prisma.response.findMany({
      where: { respondentId: user.userId },
      include: {
        form: {
          select: { title: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/forms', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, role: true }
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const forms = await prisma.form.findMany({
      include: {
        responses: {
          where: { respondentId: user.userId },
          select: { id: true }
        },
        _count: {
          select: { responses: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    });

    // If role is USER (police station), filter forms they are targeted for
    let filteredForms = forms;
    if (dbUser.role === 'USER') {
      filteredForms = forms.filter(form => 
        !form.targetStations || 
        form.targetStations.length === 0 || 
        form.targetStations.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase())
      );
    }

    const formsWithStatus = filteredForms.map(form => ({
      ...form,
      alreadyFilled: form.responses.length > 0,
      responses: undefined // Don't send full response list to everyone
    }));

    res.json(formsWithStatus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

app.post('/api/forms', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { title, description, schema, targetStations, folderId } = req.body;
  const user = (req as any).user;
  try {
    const form = await prisma.form.create({
      data: { 
        title, 
        description, 
        schema, 
        targetStations: targetStations || [],
        creatorId: user.userId,
        folderId: folderId || null
      }
    });
    
    // Notify all users about new form
    io.emit('form_created', form);
    await createLog(user.userId, 'FORM_CREATED', `Form "${title}" created`);
    
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create form' });
  }
});

app.get('/api/forms/:id', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, role: true }
    });

    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const isOversight = dbUser.role === 'ADMIN' || dbUser.role === 'CCRB';
    const form = await prisma.form.findUnique({ 
      where: { id: req.params.id },
      include: {
        responses: isOversight ? { include: { respondent: { select: { name: true, email: true } } } } : undefined,
        folder: { select: { id: true, name: true } }
      }
    });
    
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Restrict access for USER role if form is targeted and user email is not in the list
    if (dbUser.role === 'USER' && form.targetStations && form.targetStations.length > 0 && !form.targetStations.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase())) {
      return res.status(403).json({ error: 'Access denied: You are not targeted for this form' });
    }

    res.json(form);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

app.post('/api/forms/:id/submit', authenticate, async (req: Request, res: Response) => {
  const { data } = req.body;
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, role: true }
    });

    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const form = await prisma.form.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Restrict submission for USER role if form is targeted and user email is not in the list
    if (dbUser.role === 'USER' && form.targetStations && form.targetStations.length > 0 && !form.targetStations.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase())) {
      return res.status(403).json({ error: 'Access denied: You are not targeted for this form' });
    }

    const response = await prisma.response.create({
      data: { formId: req.params.id, respondentId: user.userId, data },
      include: { respondent: { select: { name: true, email: true } } }
    });
    
    // Notify creator via WebSocket
    io.to(form.id).emit('new_response', response);
    
    await createLog(user.userId, 'FORM_FILLED', `Response submitted for form "${req.params.id}"`);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

app.get('/api/responses/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await prisma.response.findUnique({
      where: { id: req.params.id },
      include: {
        form: {
          select: { id: true, title: true, schema: true }
        },
        respondent: {
          select: { name: true, email: true }
        }
      }
    });
    if (!response) return res.status(404).json({ error: 'Submission not found' });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// Template routes
app.get('/api/templates', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    const templates = await prisma.template.findMany();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.post('/api/templates', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { name, description, schema } = req.body;
  const user = (req as any).user;
  try {
    const template = await prisma.template.create({
      data: { name, description, schema, creatorId: user.userId }
    });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

app.put('/api/templates/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { name, description, schema } = req.body;
  const user = (req as any).user;
  try {
    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: { name, description, schema }
    });
    await createLog(user.userId, 'TEMPLATE_UPDATED', `Template "${name || template.name}" updated`);
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.delete('/api/templates/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});
// Folder Routes
app.get('/api/folders', authenticate, async (req: Request, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({
      include: {
        _count: {
          select: { forms: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

app.post('/api/folders', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  try {
    const existing = await prisma.folder.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'Folder already exists' });
    }
    const folder = await prisma.folder.create({
      data: { name: name.trim() }
    });
    await createLog((req as any).user.userId, 'FOLDER_CREATED', `Folder "${name}" created`);
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

app.delete('/api/folders/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.folder.delete({ where: { id: req.params.id } });
    await createLog((req as any).user.userId, 'FOLDER_DELETED', `Folder ${req.params.id} deleted`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

app.put('/api/forms/:id/folder', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { folderId } = req.body;
  try {
    const form = await prisma.form.update({
      where: { id: req.params.id },
      data: { folderId: folderId || null }
    });
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: 'Failed to move form' });
  }
});


// CCRB Dashboard endpoint (Placeholder)
app.get('/api/ccrb/dashboard', authenticate, isCCRB, async (req: Request, res: Response) => {
  res.json({ stats: [], charts: [] });
});

app.get('/api/ccrb/metrics', authenticate, isOversight, async (req: Request, res: Response) => {
  try {
    const metrics = await prisma.stationMetric.findMany();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.post('/api/ccrb/metrics', authenticate, isOversight, async (req: Request, res: Response) => {
  const { category, name, value, period, formula, color, totalFiled, totalSheets } = req.body;
  try {
    const created = await prisma.stationMetric.create({
      data: {
        category,
        name,
        value: parseFloat(value),
        period,
        formula,
        color,
        totalFiled: totalFiled !== undefined && totalFiled !== null ? parseFloat(totalFiled) : null,
        totalSheets: totalSheets !== undefined && totalSheets !== null ? parseFloat(totalSheets) : null
      }
    });
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create metric' });
  }
});

app.put('/api/ccrb/metrics/:id', authenticate, isOversight, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { value, name, category, period, formula, color, totalFiled, totalSheets } = req.body;
  try {
    const updated = await prisma.stationMetric.update({
      where: { id },
      data: {
        value: parseFloat(value),
        name,
        category,
        period,
        formula,
        color,
        totalFiled: totalFiled !== undefined && totalFiled !== null ? parseFloat(totalFiled) : null,
        totalSheets: totalSheets !== undefined && totalSheets !== null ? parseFloat(totalSheets) : null
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update metric' });
  }
});

app.delete('/api/ccrb/metrics/:id', authenticate, isOversight, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.stationMetric.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete metric' });
  }
});

// Seed CCRB user
const seedCCRB = async () => {
  try {
    const ccrbEmail = 'ccrb@mail.com';
    const existing = await prisma.user.findUnique({ where: { email: ccrbEmail } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('ccrb', 10);
      await prisma.user.create({
        data: {
          email: ccrbEmail,
          password: hashedPassword,
          name: 'CCRB Monitor',
          role: 'CCRB'
        }
      });
      console.log('CCRB User seeded');
    }
  } catch (err) {
    console.error('Failed to seed CCRB:', err);
  }
};
seedCCRB();

// Seed Station Metrics
const seedMetrics = async () => {
  try {
    const count = await prisma.stationMetric.count();
    if (count === 0) {
      await prisma.stationMetric.createMany({
        data: [
          // Charge Sheets
          { category: 'CHARGE_SHEET', name: '60_DAY', value: 60, formula: 'Total filed in that month / Total charge sheets', period: 'Monthly', color: '#1e3a8a' },
          { category: 'CHARGE_SHEET', name: '90_DAY', value: 90, formula: 'Total filed in that month / Total charge sheets', period: 'Monthly', color: '#1e3a8a' },
          { category: 'CHARGE_SHEET', name: 'ITSSO', value: 85, formula: 'Total filed in that month / Total charge sheets', period: 'Monthly', color: '#1e3a8a' },
          
          // Missing Cases 2026
          { category: 'MISSING_CASES', name: '2026_MAN', value: 12, period: '2026 YTD', color: '#1e3a8a' },
          { category: 'MISSING_CASES', name: '2026_BOY', value: 5, period: '2026 YTD', color: '#1e3a8a' },
          { category: 'MISSING_CASES', name: '2026_WOMAN', value: 8, period: '2026 YTD', color: '#1e3a8a' },
          { category: 'MISSING_CASES', name: '2026_GIRL', value: 3, period: '2026 YTD', color: '#1e3a8a' },
          
          // Missing Cases 2025
          { category: 'MISSING_CASES', name: '2025_MAN', value: 45, period: 'Full Year 2025', color: '#1e3a8a' },
          { category: 'MISSING_CASES', name: '2025_BOY', value: 20, period: 'Full Year 2025', color: '#1e3a8a' },
          { category: 'MISSING_CASES', name: '2025_WOMAN', value: 30, period: 'Full Year 2025', color: '#1e3a8a' },
          { category: 'MISSING_CASES', name: '2025_GIRL', value: 15, period: 'Full Year 2025', color: '#1e3a8a' },
          
          // Accidents
          { category: 'ACCIDENTS', name: 'FATAL', value: 18, period: 'Till Date', color: '#7f1d1d' },
          { category: 'ACCIDENTS', name: 'NON_FATAL', value: 42, period: 'Till Date', color: '#a16207' },
        ]
      });
      console.log('Station Metrics seeded');
    }
  } catch (err) {
    console.error('Failed to seed metrics:', err);
  }
};
seedMetrics();

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
