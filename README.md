# Response-Port: Police Forms & Oversight System

A high-fidelity, secure digital ecosystem for police form management and oversight monitoring. This system provides a streamlined interface for officers to submit reports, admins to build dynamic forms, and CCRB oversight officials to monitor critical organizational KPIs.

## 🚀 Features

- **Dynamic Form Builder**: Create complex, multi-field forms with support for file uploads, select menus, and conditional validation.
- **CCRB Oversight Dashboard**: A "No-Scroll" command center featuring multi-year demographic tracking and road safety indices.
- **Real-time Monitoring**: Socket.io integration for live audit logs and response tracking.
- **Secure Authentication**: Role-based access control (ADMIN, OFFICER, CCRB) with session invalidation support.
- **Advanced Export**: Filtered data extraction for administrative analysis.

## 🛠️ Tech Stack

- **Frontend**: Vite + React + Lucide Icons + CSS Variables (Theme Adaptive)
- **Backend**: Node.js + Express + Socket.io + Multer
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)

## 📦 Setup Instructions

### 1. Prerequisites

- Node.js (v18+)
- PostgreSQL Database

### 2. Backend Configuration

1. Navigate to the `backend` directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Initialize Database:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start Server:

   ```bash
   npm run dev
   ```

### 3. Frontend Configuration

1. Navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   ```

4. Start Development Server:

   ```bash
   npm run dev
   ```

## 🔐 Default Credentials (Seeded)

- **Admin**: `admin@mail.com` / `admin`
- **Officer**: `station@mail.com` / `station`
- **CCRB**: `ccrb@mail.com` / `ccrb`

## 📁 Directory Structure

- `/frontend`: Vite/React application.
- `/backend`: Express API and Prisma schema.
- `/backend/media`: Secure storage for form-related file uploads.

---

Developed as a high-fidelity oversight solution.
