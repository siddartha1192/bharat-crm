# Database Migration Guide - User Authentication

This guide will help you set up the multi-user authentication system for Bharat CRM.

## Prerequisites

- PostgreSQL database installed and running
- Node.js and npm installed
- Backend dependencies installed (`cd backend && npm install`)

## Step 1: Set Up Environment Variables

Create a `.env` file in the `/backend` directory with your database connection string:

```bash
cd backend
```

Create `.env` file with the following content:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/bharat_crm?schema=public"
PORT=3001
```

Replace:
- `USERNAME` with your PostgreSQL username (default: `postgres`)
- `PASSWORD` with your PostgreSQL password
- `bharat_crm` with your database name (create one if it doesn't exist)

Example:
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/bharat_crm?schema=public"
PORT=3001
```

## Step 2: Create Database (if not exists)

If you haven't created the database yet, create it using psql:

```bash
psql -U postgres
```

Then in psql:
```sql
CREATE DATABASE bharat_crm;
\q
```

## Step 3: Run Prisma Migration

This will create all the necessary tables including the new User table and add userId columns to existing tables:

```bash
cd backend
npx prisma migrate dev --name add_user_authentication
```

This command will:
- Create the `User` table
- Add `userId` column to `Lead`, `Contact`, `Invoice`, `Deal`, and `Task` tables
- Create foreign key relationships
- Create indexes for better query performance

## Step 4: Generate Prisma Client

After migration, generate the Prisma client:

```bash
npx prisma generate
```

## Step 5: Verify Migration

Check that the migration was successful:

```bash
npx prisma studio
```

This will open Prisma Studio in your browser where you can see:
- `User` table (new)
- `userId` field in Lead, Contact, Invoice, Deal, and Task tables

## Step 6: Install Backend Dependencies

Make sure bcryptjs is installed for password hashing:

```bash
npm install
```

## Step 7: Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Step 8: Start the Frontend

In a new terminal:

```bash
cd ..
npm run dev
```

## Step 9: Test the Authentication System

1. Open the app in your browser (usually http://localhost:5173)
2. You should be redirected to the login page
3. Click "Create an account" to register a new user
4. Fill in the registration form:
   - Email
   - Password
   - Name
   - Company (optional)
5. After registration, you'll be automatically logged in
6. Create some test data (leads, contacts, etc.)
7. Log out and create another user account
8. Verify that each user only sees their own data

## Important Changes Made

### Backend Changes:
1. **Database Schema** (`backend/prisma/schema.prisma`):
   - Added `User` model with authentication fields
   - Added `userId` foreign key to all data models
   - Added cascade delete for data cleanup

2. **Authentication Routes** (`backend/routes/auth.js`):
   - `POST /api/auth/register` - Register new user
   - `POST /api/auth/login` - Login user
   - `GET /api/auth/user/:id` - Get user by ID

3. **Data Routes** (leads, contacts, invoices, deals, tasks):
   - All routes now filter data by `userId` from `X-User-Id` header
   - Create operations automatically associate data with logged-in user
   - Update/Delete operations verify ownership before allowing changes

### Frontend Changes:
1. **Login Page** (`src/pages/Login.tsx`):
   - New login/register interface
   - Stores user session in localStorage

2. **AuthContext** (`src/contexts/AuthContext.tsx`):
   - Global authentication state management
   - login(), register(), logout() functions
   - Session persistence

3. **Protected Routes** (`src/components/auth/ProtectedRoute.tsx`):
   - Redirects to login if not authenticated
   - Shows loading state during authentication check

4. **API Calls** (`src/lib/api.ts`):
   - Automatically includes `X-User-Id` header in all requests
   - Gets userId from localStorage

5. **Header Component** (`src/components/layout/Header.tsx`):
   - Shows logged-in user information
   - Logout button

## Troubleshooting

### Migration Fails

**Error: "Environment variable not found: DATABASE_URL"**
- Make sure you created the `.env` file in the `/backend` directory
- Check that the file name is exactly `.env` (not `.env.txt`)

**Error: "Can't reach database server"**
- Make sure PostgreSQL is running
- Check your database credentials
- Verify the database exists

**Error: "P3009: migrate found failed migration"**
- Delete the `backend/prisma/migrations` folder
- Run `npx prisma migrate dev --name init` to start fresh

### Authentication Not Working

**Redirected to login immediately after logging in:**
- Check browser console for errors
- Verify that localStorage has 'user' and 'userId' items
- Check that backend is running on port 3001

**Can't see any data after login:**
- This is expected if this is your first login with a new user
- Create some test data to verify it works
- Login with a different user account and verify you don't see the first user's data

**Backend returns "User ID is required" error:**
- Make sure you're logged in
- Check that the frontend is sending the `X-User-Id` header
- Verify userId exists in localStorage

## Next Steps

After successful migration:
1. Create a test user account
2. Add some sample data (leads, contacts, etc.)
3. Log out and create another user account
4. Verify data isolation - each user should only see their own data
5. Test all CRUD operations (Create, Read, Update, Delete)
6. Test the logout functionality

## Notes

- **Data Migration**: If you had existing data before this migration, it will NOT have userId associations. You'll need to either:
  - Delete old data: `npx prisma studio` and manually delete records
  - Or manually assign userId to existing records
  - Or start fresh with new test data

- **Security**: This implementation uses localStorage for session management. For production, consider implementing JWT tokens with httpOnly cookies for better security.

- **Password Reset**: This implementation doesn't include password reset functionality. You'll need to add this separately if required.

## Support

If you encounter any issues:
1. Check the backend logs for detailed error messages
2. Check the browser console for frontend errors
3. Verify all files were created/updated correctly
4. Make sure all dependencies are installed
5. Restart both backend and frontend servers
