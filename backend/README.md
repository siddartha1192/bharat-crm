# Bharat CRM Backend

Lightweight PostgreSQL backend with Express.js and Prisma ORM for persistent data storage.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Quick Setup

### 1. Install PostgreSQL

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**On macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**On Windows:**
Download and install from: https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE bharat_crm;
CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bharat_crm TO your_username;
\q
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

Update `.env` with your database credentials:
```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/bharat_crm?schema=public"
PORT=3001
```

### 5. Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate
```

### 6. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The API will be available at: `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Leads
- `GET /api/leads` - Get all leads
- `GET /api/leads/:id` - Get single lead
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/stats/summary` - Get lead statistics

### Contacts
- `GET /api/contacts` - Get all contacts
- `GET /api/contacts/:id` - Get single contact
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/stats/summary` - Get contact statistics

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/stats/summary` - Get invoice statistics

### Deals
- `GET /api/deals` - Get all deals
- `GET /api/deals/:id` - Get single deal
- `POST /api/deals` - Create new deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Query Parameters

**Leads:**
- `?status=new` - Filter by status (new, contacted, qualified, etc.)
- `?assignedTo=John` - Filter by assignee

**Contacts:**
- `?type=customer` - Filter by type (customer, prospect, partner, vendor)
- `?assignedTo=John` - Filter by assignee

**Invoices:**
- `?status=paid` - Filter by status (draft, sent, paid, overdue, cancelled)

**Tasks:**
- `?status=todo` - Filter by status (todo, in-progress, completed)

## Database Management

**View database in Prisma Studio:**
```bash
npm run prisma:studio
```

This will open a web interface at `http://localhost:5555` where you can view and edit your data.

**Reset database (WARNING: Deletes all data):**
```bash
npx prisma migrate reset
```

## Development Tips

1. **Auto-reload**: The `npm run dev` command uses nodemon for automatic server restart on code changes.

2. **Database Schema Changes**: After modifying `prisma/schema.prisma`, run:
   ```bash
   npm run prisma:migrate
   ```

3. **Prisma Client**: If you modify the schema, regenerate the client:
   ```bash
   npm run prisma:generate
   ```

4. **Logs**: Check console for API request logs and error messages.

## Troubleshooting

**Connection refused:**
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`

**Port already in use:**
- Change PORT in `.env` to a different port (e.g., 3002)

**Prisma errors:**
- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Run `npm run prisma:generate` to regenerate Prisma Client

## Production Deployment

For production, consider:
1. Use environment variables for sensitive data
2. Set up proper error logging (Winston, Pino)
3. Use a process manager (PM2, systemd)
4. Set up database backups
5. Use connection pooling for PostgreSQL
6. Enable HTTPS with SSL certificates

## Tech Stack

- **Express.js** - Web framework
- **Prisma** - ORM for PostgreSQL
- **PostgreSQL** - Database
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
