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
// import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import { generateToken, authenticate, isAdmin, isHOD, isOversight } from './auth';

dotenv.config();

// Cloudinary config disabled for local setup


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

// File upload route - Local storage
app.post('/api/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const localUrl = `${req.protocol}://${req.get('host')}/media/${req.file.filename}`;
    res.json({ url: localUrl, filename: req.file.filename, originalName: req.file.originalname });
  } catch (err) {
    console.error('Local upload failed:', err);
    res.status(500).json({ error: 'Local upload failed' });
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
      select: { id: true, email: true, name: true, role: true, department: true, createdAt: true }
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
      select: { id: true, email: true, name: true, role: true, department: true, createdAt: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/manage-users', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { email, password, name, role, department } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        role, 
        department: role !== 'IQAC_ADMIN' ? department : null 
      }
    });
    await createLog((req as any).user.userId, 'CREATED_USER', `Created user ${email}`);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/manage-users/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { email, password, name, role, department } = req.body;
  try {
    const data: any = { 
      email, 
      name, 
      role, 
      department: role !== 'IQAC_ADMIN' ? department : null 
    };
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
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, department: true }
    });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const where: any = {};
    if (formId) where.formId = formId as string;
    if (respondentId) where.respondentId = respondentId as string;
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate as string);
      if (endDate) where.submittedAt.lte = new Date(endDate as string);
    }

    // Role restrictions for exports
    if (dbUser.role === 'HOD') {
      where.respondent = { department: dbUser.department || '' };
    } else if (dbUser.role === 'IQAC_ADMIN') {
      where.status = 'APPROVED';
    }

    const responses = await prisma.response.findMany({
      where,
      include: {
        form: { select: { title: true, schema: true } },
        respondent: { select: { name: true, email: true, department: true } }
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

app.get('/api/admin/pending-tracker', authenticate, isOversight, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, department: true }
    });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const where: any = { status: 'PENDING' };
    if (dbUser.role === 'HOD') {
      where.respondent = { department: dbUser.department || '' };
    }

    const pendingResponses = await prisma.response.findMany({
      where,
      include: {
        form: { select: { id: true, title: true } },
        respondent: { select: { name: true, email: true, department: true } }
      },
      orderBy: { submittedAt: 'asc' }
    });

    const hods = await prisma.user.findMany({
      where: { role: 'HOD' },
      select: { id: true, name: true, email: true, department: true }
    });

    res.json({ responses: pendingResponses, hods });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending tracker data' });
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
      select: { email: true, role: true, department: true }
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const forms = await prisma.form.findMany({
      include: {
        responses: {
          where: { respondentId: user.userId },
          select: { id: true, status: true, rejectionComment: true }
        },
        _count: {
          select: { responses: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    });

    // If role is FACULTY, filter forms they are targeted for
    let filteredForms = forms;
    if (dbUser.role === 'FACULTY') {
      const deptEmail = dbUser.department ? `${dbUser.department.toLowerCase()}@mail.com` : null;
      filteredForms = forms.filter(form => 
        !form.targetNames || 
        form.targetNames.length === 0 || 
        form.targetNames.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase()) ||
        (deptEmail && form.targetNames.map(email => email.toLowerCase()).includes(deptEmail.toLowerCase()))
      );
    }

    const formsWithStatus = filteredForms.map(form => ({
      ...form,
      alreadyFilled: form.responses.length > 0,
      responseStatus: form.responses[0]?.status || null,
      rejectionComment: form.responses[0]?.rejectionComment || null,
      responses: undefined // Don't send full response list to everyone
    }));

    res.json(formsWithStatus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

app.post('/api/forms', authenticate, isAdmin, async (req: Request, res: Response) => {
  const { title, description, schema, targetNames, folderId } = req.body;
  const user = (req as any).user;
  try {
    const form = await prisma.form.create({
      data: { 
        title, 
        description, 
        schema, 
        targetNames: targetNames || [],
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

app.delete('/api/forms/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const form = await prisma.form.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Responses will be cascade-deleted via Prisma schema (onDelete: Cascade)
    await prisma.form.delete({ where: { id: req.params.id } });

    // Notify all connected clients that the form has been deleted
    io.emit('form_deleted', { id: req.params.id });

    await createLog(user.userId, 'FORM_DELETED', `Form "${form.title}" deleted`);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete form:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

app.get('/api/forms/:id', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, role: true, department: true }
    });

    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    let responsesQuery: any = undefined;
    if (dbUser.role === 'IQAC_ADMIN') {
      responsesQuery = {
        where: { status: 'APPROVED' },
        include: { respondent: { select: { name: true, email: true, department: true } } }
      };
    } else if (dbUser.role === 'HOD') {
      responsesQuery = {
        where: { respondent: { department: dbUser.department || '' } },
        include: { respondent: { select: { name: true, email: true, department: true } } }
      };
    }

    const includeQuery: any = {
      folder: { select: { id: true, name: true } }
    };
    if (responsesQuery) {
      includeQuery.responses = responsesQuery;
    }

    const form = await prisma.form.findUnique({ 
      where: { id: req.params.id },
      include: includeQuery
    });
    
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Restrict access for FACULTY role if form is targeted and user email is not in the list
    if (dbUser.role === 'FACULTY' && form.targetNames && form.targetNames.length > 0 && !form.targetNames.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase())) {
      const deptEmail = dbUser.department ? `${dbUser.department.toLowerCase()}@mail.com` : null;
      const isTargeted = form.targetNames.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase()) ||
                         (deptEmail && form.targetNames.map(email => email.toLowerCase()).includes(deptEmail.toLowerCase()));
      if (!isTargeted) {
        return res.status(403).json({ error: 'Access denied: You are not targeted for this form' });
      }
    }

    res.json(form);
  } catch (err) {
    console.error('Failed to fetch form details:', err);
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

    // Restrict submission for FACULTY role if form is targeted and user email is not in the list
    if (dbUser.role === 'FACULTY' && form.targetNames && form.targetNames.length > 0 && !form.targetNames.map(email => email.toLowerCase()).includes(dbUser.email.toLowerCase())) {
      return res.status(403).json({ error: 'Access denied: You are not targeted for this form' });
    }

    // Check if approved response already exists
    const existing = await prisma.response.findFirst({
      where: { formId: req.params.id, respondentId: user.userId }
    });
    if (existing && existing.status === 'APPROVED') {
      return res.status(403).json({ error: 'Response is already approved and locked' });
    }

    const response = await prisma.response.create({
      data: { formId: req.params.id, respondentId: user.userId, data, status: 'PENDING' },
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
  const user = (req as any).user;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, department: true }
    });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const response = await prisma.response.findUnique({
      where: { id: req.params.id },
      include: {
        form: {
          select: { id: true, title: true, schema: true }
        },
        respondent: {
          select: { name: true, email: true, department: true }
        }
      }
    });
    if (!response) return res.status(404).json({ error: 'Submission not found' });

    // Admin can only view if APPROVED
    if (dbUser.role === 'IQAC_ADMIN' && response.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Access denied: only HOD approved submissions are viewable by IQAC admins' });
    }

    // HOD can only view if same department
    if (dbUser.role === 'HOD' && response.respondent?.department !== dbUser.department) {
      return res.status(403).json({ error: 'Access denied: HODs can only view submissions from their own department' });
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// HOD & Faculty Workflow Routes
app.get('/api/forms/:id/my-response', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const response = await prisma.response.findFirst({
      where: { formId: req.params.id, respondentId: user.userId }
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user response' });
  }
});

app.put('/api/responses/:id', authenticate, async (req: Request, res: Response) => {
  const { data } = req.body;
  const user = (req as any).user;
  try {
    const existing = await prisma.response.findUnique({
      where: { id: req.params.id },
      include: { form: true }
    });
    if (!existing) return res.status(404).json({ error: 'Response not found' });
    
    const isFaculty = user.role === 'FACULTY';
    const isAdmin = user.role === 'IQAC_ADMIN';

    // Faculty can only edit if not approved
    if (isFaculty) {
      if (existing.respondentId !== user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (existing.status === 'APPROVED') {
        return res.status(403).json({ error: 'Response is locked and cannot be edited by faculty' });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: only faculty or IQAC admin can edit response data' });
    }

    const updated = await prisma.response.update({
      where: { id: req.params.id },
      data: { 
        data,
        status: isFaculty ? 'PENDING' : existing.status // reset status if edited by Faculty
      }
    });

    io.to(existing.formId).emit('response_updated', updated);

    await createLog(user.userId, 'RESPONSE_UPDATED', `Response for form "${existing.formId}" updated`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update response' });
  }
});

app.delete('/api/responses/:id', authenticate, isAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const existing = await prisma.response.findUnique({
      where: { id: req.params.id },
      include: { form: true }
    });
    if (!existing) return res.status(404).json({ error: 'Response not found' });

    await prisma.response.delete({
      where: { id: req.params.id }
    });

    io.to(existing.formId).emit('response_deleted', { id: req.params.id });

    await createLog(user.userId, 'RESPONSE_DELETED', `Response ${req.params.id} for form "${existing.form.title}" deleted by IQAC Admin`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

app.post('/api/responses/:id/review', authenticate, isOversight, async (req: Request, res: Response) => {
  const { status, comment } = req.body; // APPROVED or REJECTED
  const user = (req as any).user;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, department: true }
    });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const existing = await prisma.response.findUnique({
      where: { id: req.params.id },
      include: { respondent: { select: { department: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Response not found' });

    // HOD can only review their own department's submissions
    if (dbUser.role === 'HOD' && existing.respondent?.department !== dbUser.department) {
      return res.status(403).json({ error: 'Access denied: you can only review submissions from your own department' });
    }

    const updated = await prisma.response.update({
      where: { id: req.params.id },
      data: { 
        status,
        rejectionComment: comment || null
      }
    });

    io.to(existing.formId).emit('response_reviewed', updated);

    await createLog(user.userId, `RESPONSE_${status}`, `Response ${req.params.id} has been ${status} by ${user.role} ${user.userId}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to review response' });
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
    console.error('Failed to create template:', err);
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
    // Manually disconnect all forms linked to this folder first to prevent foreign key errors
    await prisma.form.updateMany({
      where: { folderId: req.params.id },
      data: { folderId: null }
    });

    await prisma.folder.delete({ where: { id: req.params.id } });
    await createLog((req as any).user.userId, 'FOLDER_DELETED', `Folder ${req.params.id} deleted`);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete folder:', err);
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
app.get('/api/ccrb/dashboard', authenticate, isHOD, async (req: Request, res: Response) => {
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

// Seed HOD user
const seedHOD = async () => {
  try {
    const hodEmail = 'hod@mail.com';
    const existing = await prisma.user.findUnique({ where: { email: hodEmail } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('hod', 10);
      await prisma.user.create({
        data: {
          email: hodEmail,
          password: hashedPassword,
          name: 'Department HOD',
          role: 'HOD'
        }
      });
      console.log('HOD User seeded');
    }
  } catch (err) {
    console.error('Failed to seed HOD:', err);
  }
};
seedHOD();

// Seed Metrics (Academic/IQAC focused)
const seedMetrics = async () => {
  try {
    const count = await prisma.stationMetric.count();
    if (count === 0) {
      await prisma.stationMetric.createMany({
        data: [
          { category: 'IQAC_AUDIT', name: 'SUBMISSION_RATE', value: 92, formula: 'Completed forms / Total forms', period: 'Current Semester', color: '#2563eb' },
          { category: 'IQAC_AUDIT', name: 'APPROVAL_RATE', value: 85, formula: 'Approved responses / Total responses', period: 'Current Semester', color: '#8b5cf6' },
          { category: 'IQAC_AUDIT', name: 'PENDING_REVIEW', value: 15, formula: 'Pending responses / Total responses', period: 'YTD', color: '#10b981' },
        ]
      });
      console.log('IQAC Metrics seeded');
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
