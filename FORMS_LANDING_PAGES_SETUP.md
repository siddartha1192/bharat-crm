# 🚀 Forms & Landing Pages Setup Guide

## Problem: Forms and Landing Pages Not Loading

The forms and landing pages aren't loading because the database migration hasn't been applied yet.

---

## ✅ Solution: Apply the Database Migration

### Method 1: Using Node.js Script (Recommended)

This works if you have the backend dependencies installed:

```bash
cd backend
node apply-forms-migration.js
```

### Method 2: Using Prisma Migrate (If Database is Running)

```bash
cd backend
npx prisma migrate deploy
```

### Method 3: Manual SQL (If you have psql access)

```bash
# From project root
./apply-migration.sh
```

Or manually:
```bash
psql <your-database-url> -f backend/prisma/migrations/add_forms_and_landing_pages.sql
```

### Method 4: Using Docker Compose (If Docker is Available)

If you have Docker installed, you can start the entire stack:

```bash
# Start the database
docker compose up -d postgres

# Wait for database to be ready (about 10 seconds)
sleep 10

# Apply migration
cd backend
npx prisma migrate deploy

# Or use the Node script
node apply-forms-migration.js
```

---

## 🔍 Troubleshooting

### Check if Database is Running

```bash
# Check PostgreSQL connection
pg_isready -h localhost -p 5432

# Or try to connect
psql -h localhost -p 5432 -U postgres -d bharat_crm
```

### Check Backend Logs

Look for connection errors in your backend console. You might see:
```
Error: P1001: Can't reach database server at `localhost`:`5432`
```

This means PostgreSQL is not running.

### Verify Migration Was Applied

After applying the migration, verify the tables exist:

```bash
cd backend
npx prisma studio
```

Or check in psql:
```sql
\dt  -- List all tables
-- You should see: Form, FormSubmission, LandingPage
```

---

## 📦 What the Migration Creates

The migration adds 3 new tables:

1. **Form** - Embeddable lead capture forms
   - Stores form configuration, styling, fields
   - Tracks views and submissions

2. **FormSubmission** - Form submission data
   - Stores all form submissions
   - Automatically creates leads in CRM
   - Tracks UTM parameters

3. **LandingPage** - AI-powered landing pages
   - Stores page content and theme
   - Supports AI editing
   - Integrates with forms

---

## 🚀 After Migration is Applied

1. **Restart Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Access the Features**
   - Forms: http://localhost:5173/forms
   - Landing Pages: http://localhost:5173/landing-pages

3. **Test Form Creation**
   - Go to Forms page
   - Click "Create Form"
   - Fill in details and save

4. **Test Landing Page Builder**
   - Go to Landing Pages
   - Click "Create Page"
   - You'll be taken to the visual builder

---

## 🆘 Still Having Issues?

### Backend Not Connecting to Database

Check your `backend/.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/bharat_crm?schema=public"
```

Make sure the credentials match your PostgreSQL setup.

### CORS Errors

If you see CORS errors, make sure your backend is running on port 3001 and frontend on 5173.

### "Failed to fetch forms" Error

1. Check backend is running: `http://localhost:3001/api/health`
2. Check authentication token is valid
3. Check browser console for detailed error
4. Verify migration was applied

---

## 📝 Quick Start Commands

```bash
# 1. Start Database (if using Docker)
docker compose up -d postgres

# 2. Apply Migration
cd backend
node apply-forms-migration.js

# 3. Start Backend
npm start

# 4. Start Frontend (in another terminal)
cd ..
npm run dev

# 5. Open Browser
# http://localhost:5173/forms
```

---

## ✨ Features Available After Setup

### Forms
- ✅ Create embeddable forms
- ✅ Customize colors, buttons, messages
- ✅ Copy embed code
- ✅ Track views and submissions
- ✅ Auto-create leads in CRM

### Landing Pages
- ✅ Visual page builder
- ✅ AI-powered editing
- ✅ All sections (Header, Hero, Services, etc.)
- ✅ Theme customization
- ✅ Code snippet management
- ✅ Publish/unpublish
- ✅ Live preview

---

## 🔗 Helpful Links

- Migration SQL: `backend/prisma/migrations/add_forms_and_landing_pages.sql`
- Prisma Schema: `backend/prisma/schema.prisma`
- Forms API: `backend/routes/forms.js`
- Landing Pages API: `backend/routes/landingPages.js`
- Embed Widget: `backend/public/embed.js`
