# Bharat CRM - Technical Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [High-Level Architecture](#high-level-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Architecture](#database-architecture)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [File & Folder Structure](#file--folder-structure)
9. [Feature-Specific Flows](#feature-specific-flows)
10. [Security & Authentication](#security--authentication)
11. [API Documentation](#api-documentation)

---

## 1. System Overview

Bharat CRM is a full-stack Customer Relationship Management system built with modern web technologies. It follows a **client-server architecture** with a React-based frontend and Node.js/Express backend, using PostgreSQL as the database.

### Architecture Type
- **Pattern:** MVC (Model-View-Controller) with separation of concerns
- **Communication:** RESTful API
- **Data Format:** JSON
- **Authentication:** JWT (JSON Web Tokens) + OAuth2

### Key Design Principles
- **Separation of Concerns:** Frontend, Backend, Database are clearly separated
- **Reusability:** Shared components, services, and utilities
- **Scalability:** Modular architecture allows easy feature additions
- **Security:** Role-based access control, secure authentication
- **Performance:** Optimized queries, lazy loading, background processing

---

## 2. Technology Stack

### Frontend
```
React 18.3          - UI framework
TypeScript          - Type-safe JavaScript
Vite                - Build tool and dev server
Tailwind CSS        - Utility-first CSS framework
Shadcn UI           - Component library
Recharts            - Chart library for data visualization
React Router        - Client-side routing
Sonner              - Toast notifications
Lucide React        - Icon library
```

### Backend
```
Node.js 18+         - JavaScript runtime
Express.js          - Web application framework
Prisma ORM          - Database ORM and migrations
Multer              - File upload middleware
Nodemailer          - Email sending
Google APIs         - Gmail OAuth2 integration
Bcrypt              - Password hashing
JWT                 - Token-based authentication
```

### Database
```
PostgreSQL          - Relational database
Prisma Client       - Type-safe database client
```

### Development Tools
```
ESLint              - Code linting
Prettier            - Code formatting
Git                 - Version control
npm                 - Package management
```

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │           React Frontend (Port 5173)                │     │
│  │  - UI Components (Shadcn)                          │     │
│  │  - State Management (Context API)                  │     │
│  │  - Routing (React Router)                          │     │
│  │  - API Client (Fetch API)                          │     │
│  └────────────────┬───────────────────────────────────┘     │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTP/HTTPS (REST API)
                    │ JSON Payloads
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                      SERVER LAYER                             │
│  ┌────────────────────────────────────────────────────┐      │
│  │         Express.js Backend (Port 5000)              │      │
│  │  ┌──────────────────────────────────────────┐      │      │
│  │  │         Middleware Layer                  │      │      │
│  │  │  - Authentication (JWT)                   │      │      │
│  │  │  - Authorization (Role-based)             │      │      │
│  │  │  - File Upload (Multer)                   │      │      │
│  │  │  - Error Handling                         │      │      │
│  │  │  - CORS                                   │      │      │
│  │  └──────────────────────────────────────────┘      │      │
│  │  ┌──────────────────────────────────────────┐      │      │
│  │  │          Routes Layer                     │      │      │
│  │  │  - /api/auth                              │      │      │
│  │  │  - /api/leads                             │      │      │
│  │  │  - /api/contacts                          │      │      │
│  │  │  - /api/deals                             │      │      │
│  │  │  - /api/tasks                             │      │      │
│  │  │  - /api/emails                            │      │      │
│  │  │  - /api/automation                        │      │      │
│  │  │  - /api/documents                         │      │      │
│  │  │  - /api/sales-forecast                    │      │      │
│  │  │  - /api/vector-data                       │      │      │
│  │  └──────────────────────────────────────────┘      │      │
│  │  ┌──────────────────────────────────────────┐      │      │
│  │  │         Services Layer                    │      │      │
│  │  │  - leadService.js                         │      │      │
│  │  │  - emailService.js                        │      │      │
│  │  │  - automationService.js                   │      │      │
│  │  │  - salesForecastService.js                │      │      │
│  │  │  - Business Logic                         │      │      │
│  │  └──────────────────────────────────────────┘      │      │
│  │  ┌──────────────────────────────────────────┐      │      │
│  │  │       Data Access Layer                   │      │      │
│  │  │  - Prisma Client                          │      │      │
│  │  │  - Database Queries                       │      │      │
│  │  │  - Transactions                           │      │      │
│  │  └──────────────────────────────────────────┘      │      │
│  └────────────────┬───────────────────────────────────┘      │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ SQL Queries
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                     DATABASE LAYER                            │
│  ┌────────────────────────────────────────────────────┐      │
│  │         PostgreSQL Database                         │      │
│  │  - User data                                        │      │
│  │  - Leads, Contacts, Deals, Tasks                    │      │
│  │  - Email logs                                       │      │
│  │  - Automation rules                                 │      │
│  │  - Documents metadata                               │      │
│  │  - Sales forecasts                                  │      │
│  └────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                          │
│  - Gmail API (OAuth2, Email Sending)                         │
│  - File System (Document Storage)                            │
│  - Vector Database (AI/Embeddings)                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend Architecture

### 4.1 Directory Structure

```
src/
├── assets/              # Static assets (images, fonts)
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Shadcn)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   ├── layout/         # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── settings/       # Settings-related components
│   │   ├── AutomationSettings.tsx
│   │   ├── VectorDataUpload.tsx
│   │   └── ...
│   └── [feature]/      # Feature-specific components
├── contexts/           # React Context providers
│   ├── AuthContext.tsx      # Authentication state
│   └── ThemeContext.tsx     # Theme state
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useLeads.ts
│   └── ...
├── lib/                # Utility libraries
│   ├── api.ts          # API client
│   ├── utils.ts        # Helper functions
│   └── constants.ts    # App constants
├── pages/              # Page components (Routes)
│   ├── Dashboard.tsx
│   ├── Leads.tsx
│   ├── Contacts.tsx
│   ├── Deals.tsx
│   ├── Tasks.tsx
│   ├── Calendar.tsx
│   ├── Analytics.tsx
│   ├── SalesForecast.tsx
│   ├── Settings.tsx
│   └── Login.tsx
├── types/              # TypeScript type definitions
│   ├── lead.ts
│   ├── contact.ts
│   ├── deal.ts
│   └── ...
├── App.tsx             # Root component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

### 4.2 Component Architecture

```
┌─────────────────────────────────────────┐
│            App.tsx                       │
│  - Router Setup                          │
│  - Context Providers                     │
│  - Global Error Boundary                 │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼─────────┐   ┌──────▼──────────┐
│ Auth Pages  │   │  Protected Pages │
│ - Login     │   │  (with Layout)   │
│ - Register  │   └──────┬───────────┘
└─────────────┘          │
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐
   │ Header   │    │ Sidebar  │    │ Content  │
   └──────────┘    └──────────┘    └────┬─────┘
                                        │
                    ┌───────────────────┼───────────────┐
                    │                   │               │
              ┌─────▼──────┐   ┌───────▼────┐   ┌─────▼──────┐
              │ Dashboard  │   │   Leads    │   │  Settings  │
              │   Page     │   │   Page     │   │    Page    │
              └────────────┘   └─────┬──────┘   └─────┬──────┘
                                     │                │
                          ┌──────────▼──────┐  ┌──────▼──────────┐
                          │ LeadDetailDialog│  │ AutomationSettings│
                          │ - Info Tab      │  │ - Rules List     │
                          │ - Activity Tab  │  │ - Create/Edit    │
                          │ - Documents Tab │  │ - Toggle Enable  │
                          └─────────────────┘  └──────────────────┘
```

### 4.3 State Management

**Context API Pattern:**
```typescript
// AuthContext.tsx
Context Creation → Provider Component → Hook (useAuth)
                                           ↓
                              Used in components for auth state
```

**Data Flow:**
1. Component mounts → useEffect hook
2. Call API via api.ts → Fetch data
3. Update local state → useState
4. Render UI with data
5. User interaction → Event handler
6. Call API to update → Optimistic update or refetch
7. Re-render with new data

### 4.4 API Client Architecture

**File:** `src/lib/api.ts`

```typescript
┌─────────────────────────────────────────┐
│          api.ts (API Client)             │
├─────────────────────────────────────────┤
│  fetchAPI(endpoint, options)             │
│    - Gets JWT token from localStorage    │
│    - Adds Authorization header           │
│    - Handles 401 (redirect to login)     │
│    - Returns parsed JSON                 │
├─────────────────────────────────────────┤
│  api.get(endpoint)                       │
│  api.post(endpoint, body)                │
│  api.put(endpoint, body)                 │
│  api.patch(endpoint, body)               │
│  api.delete(endpoint)                    │
└─────────────────────────────────────────┘
         ↓
Used by all components to make API calls
```

---

## 5. Backend Architecture

### 5.1 Directory Structure

```
backend/
├── middleware/              # Express middleware
│   ├── auth.js             # JWT authentication & role authorization
│   └── upload.js           # Multer file upload configuration
├── routes/                 # API route handlers
│   ├── auth.js            # POST /login, /register
│   ├── leads.js           # CRUD for leads
│   ├── contacts.js        # CRUD for contacts
│   ├── deals.js           # CRUD for deals
│   ├── tasks.js           # CRUD for tasks
│   ├── emails.js          # Email operations
│   ├── automation.js      # Automation rules CRUD
│   ├── documents.js       # Document upload/download/delete
│   ├── salesForecast.js   # Sales forecasting data
│   └── vectorData.js      # Vector database management
├── services/              # Business logic layer
│   ├── lead.js           # Lead business logic
│   ├── email.js          # Email service (Gmail OAuth2)
│   ├── automation.js     # Automation engine
│   └── salesForecast.js  # Forecast calculations
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema definition
│   └── migrations/       # Database migration files
├── scripts/              # Utility scripts
│   ├── ingestDocuments.js  # Vector DB ingestion
│   └── seed.js            # Database seeding
├── documents/            # Uploaded documents storage
│   └── Lead/            # Organized by entity type
│       └── {leadId}/    # Unique folder per lead
├── knowledge_base/       # Vector database documents
├── server.js            # Express server entry point
└── package.json         # Dependencies and scripts
```

### 5.2 Request Flow

```
HTTP Request from Frontend
         ↓
┌────────────────────────┐
│   Express Server       │
│   (server.js)          │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│  Middleware Layer      │
│  1. CORS              │
│  2. JSON Parser       │
│  3. Authentication    │ ← Verify JWT token
│  4. Authorization     │ ← Check user role
│  5. File Upload       │ ← If multipart/form-data
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│   Route Handler        │
│   (routes/*.js)        │
│   - Parse request      │
│   - Validate input     │
│   - Call service       │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│   Service Layer        │
│   (services/*.js)      │
│   - Business logic     │
│   - Data validation    │
│   - Call Prisma        │
│   - Trigger automation │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│   Data Access Layer    │
│   (Prisma Client)      │
│   - Query database     │
│   - Transactions       │
│   - Relations          │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│   PostgreSQL Database  │
└────────────────────────┘
         ↓
Response flows back up the chain
         ↓
JSON Response to Frontend
```

### 5.3 Middleware Architecture

**File:** `backend/middleware/auth.js`

```javascript
┌─────────────────────────────────────────┐
│      Authentication Middleware          │
├─────────────────────────────────────────┤
│  authenticate(req, res, next)           │
│    1. Extract token from headers        │
│    2. Verify JWT signature              │
│    3. Decode payload                    │
│    4. Attach user to req.user           │
│    5. Call next() or return 401         │
├─────────────────────────────────────────┤
│  authorize(...roles)                    │
│    1. Check if req.user exists          │
│    2. Check if user.role in allowed     │
│    3. Call next() or return 403         │
└─────────────────────────────────────────┘
```

**File:** `backend/middleware/upload.js`

```javascript
┌─────────────────────────────────────────┐
│       File Upload Middleware            │
├─────────────────────────────────────────┤
│  documentStorage (Multer)               │
│    - Destination: documents/{type}/{id} │
│    - Filename: timestamp-original       │
│    - File size limit: 100MB             │
├─────────────────────────────────────────┤
│  vectorDataStorage (Multer)             │
│    - Destination: knowledge_base/       │
│    - Filename: sanitized original       │
│    - File size limit: 50MB              │
└─────────────────────────────────────────┘
```

### 5.4 Service Layer Pattern

**Example:** `backend/services/automation.js`

```javascript
┌─────────────────────────────────────────────────┐
│         Automation Service                       │
├─────────────────────────────────────────────────┤
│  triggerAutomation(event, data, user)           │
│    1. Find all enabled rules for event          │
│    2. Check conditions (fromStage, toStage)     │
│    3. Execute actions (email, task, assign)     │
│    4. Log execution                             │
├─────────────────────────────────────────────────┤
│  executeEmailAction(rule, data, user)           │
│    1. Get template (custom or default)          │
│    2. Prepare variables (name, company, etc.)   │
│    3. Replace template placeholders             │
│    4. Send email via emailService               │
│    5. Log email                                 │
├─────────────────────────────────────────────────┤
│  saveAutomationRule(userId, ruleData)           │
│    1. Sanitize input (trim, convert empty)      │
│    2. Create or update in database              │
│    3. Return rule object                        │
├─────────────────────────────────────────────────┤
│  getAutomationRules(userId)                     │
│  deleteAutomationRule(ruleId, userId)           │
│  toggleAutomationRule(ruleId, userId, enabled)  │
└─────────────────────────────────────────────────┘
```

---

## 6. Database Architecture

### 6.1 Schema Overview

**File:** `backend/prisma/schema.prisma`

```prisma
┌─────────────────────────────────────────┐
│              User                        │
├─────────────────────────────────────────┤
│ id: String (UUID)                       │
│ email: String (unique)                  │
│ password: String (hashed)               │
│ name: String                            │
│ role: String (ADMIN/MANAGER/AGENT)      │
│ googleAccessToken: String?              │
│ googleRefreshToken: String?             │
│ createdAt: DateTime                     │
└─────────┬───────────────────────────────┘
          │
          │ 1:N relationships
          │
    ┌─────┴─────┬─────────┬─────────┬─────────┐
    │           │         │         │         │
┌───▼───┐  ┌───▼───┐  ┌─▼────┐  ┌─▼────┐  ┌─▼──────────┐
│ Lead  │  │Contact│  │ Deal │  │ Task │  │ Automation │
└───────┘  └───────┘  └──────┘  └──────┘  │   Rule     │
                                            └────────────┘

Relationships:
- User → Leads (1:N)
- User → Contacts (1:N)
- User → Deals (1:N)
- User → Tasks (1:N)
- User → EmailLogs (1:N)
- User → AutomationRules (1:N)
- User → Documents (1:N)
- Lead → Deal (1:1)
- Contact → Deals (N:N)
```

### 6.2 Core Models

**User Model:**
```prisma
model User {
  id                  String    @id @default(uuid())
  email               String    @unique
  password            String
  name                String
  role                String    @default("AGENT")
  googleEmail         String?
  googleAccessToken   String?   @db.Text
  googleRefreshToken  String?   @db.Text
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  leads               Lead[]
  contacts            Contact[]
  deals               Deal[]
  tasks               Task[]
  emailLogs           EmailLog[]
  automationRules     AutomationRule[]
  documents           Document[]
}
```

**Lead Model:**
```prisma
model Lead {
  id          String    @id @default(uuid())
  name        String
  email       String
  company     String?
  phone       String?
  status      String    @default("new")
  source      String?
  assignedTo  String?
  notes       String?   @db.Text
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  deal        Deal?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([status])
}
```

**AutomationRule Model:**
```prisma
model AutomationRule {
  id                String    @id @default(uuid())
  name              String
  type              String    // 'lead_created' | 'stage_change'
  isEnabled         Boolean   @default(true)
  triggerEvent      String    // 'lead.created' | 'lead.stage_changed'
  triggerConditions Json?
  actionType        String    // 'send_email' | 'create_task'
  actionConfig      Json?
  emailSubject      String?
  emailTemplate     String?   @db.Text
  fromStage         String?
  toStage           String?
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
  @@index([triggerEvent])
  @@index([isEnabled])
}
```

**Document Model:**
```prisma
model Document {
  id          String    @id @default(uuid())
  fileName    String
  fileSize    Int
  mimeType    String
  filePath    String
  entityType  String    // 'Lead' | 'Contact' | 'Deal'
  entityId    String
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())

  @@index([entityType, entityId])
  @@index([userId])
}
```

### 6.3 Indexes & Performance

**Indexed Fields:**
- `User.email` - Unique index for fast login lookups
- `Lead.userId` - Fast filtering by user
- `Lead.status` - Fast filtering by status
- `AutomationRule.userId` - Fast user-specific queries
- `AutomationRule.triggerEvent` - Fast event matching
- `AutomationRule.isEnabled` - Filter enabled rules quickly
- `Document.entityType + entityId` - Fast document lookups per entity

---

## 7. Data Flow Diagrams

### 7.1 Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ▼
┌──────────────────┐
│  Auth Route      │
│  routes/auth.js  │
└──────┬───────────┘
       │
       │ 2. Find user by email
       │    Compare password hash
       ▼
┌──────────────────┐
│    Database      │
│  (Prisma)        │
└──────┬───────────┘
       │
       │ 3. User found
       ▼
┌──────────────────┐
│  Generate JWT    │
│  Sign token with │
│  user payload    │
└──────┬───────────┘
       │
       │ 4. Return token + user data
       ▼
┌──────────────────┐
│   Browser        │
│  Store token in  │
│  localStorage    │
└──────────────────┘
       │
       │ 5. All future requests include:
       │    Authorization: Bearer <token>
       ▼
┌──────────────────┐
│  Auth Middleware │
│  Verify token    │
│  Attach user to  │
│  req.user        │
└──────────────────┘
```

### 7.2 Lead Creation with Automation Flow

```
┌─────────────┐
│  Frontend   │
│  Leads Page │
└──────┬──────┘
       │
       │ 1. User fills form and submits
       │    POST /api/leads
       │    { name, email, company, ... }
       ▼
┌──────────────────────┐
│  Middleware          │
│  - authenticate      │ ← Verify JWT
│  - authorize         │ ← Check role
└──────┬───────────────┘
       │
       │ 2. Request validated
       ▼
┌──────────────────────┐
│  Lead Route          │
│  routes/leads.js     │
└──────┬───────────────┘
       │
       │ 3. Call leadService.createLead()
       ▼
┌──────────────────────┐
│  Lead Service        │
│  services/lead.js    │
└──────┬───────────────┘
       │
       │ 4. Create lead in database
       │    Create associated deal
       ▼
┌──────────────────────┐
│  Prisma Transaction  │
│  - Create Lead       │
│  - Create Deal       │
└──────┬───────────────┘
       │
       │ 5. Lead created successfully
       ▼
┌──────────────────────────┐
│  Trigger Automation      │
│  automationService       │
│  .triggerAutomation()    │
└──────┬───────────────────┘
       │
       │ 6. Find enabled rules for
       │    event: 'lead.created'
       ▼
┌──────────────────────────┐
│  Query AutomationRule    │
│  WHERE triggerEvent =    │
│    'lead.created'        │
│  AND isEnabled = true    │
└──────┬───────────────────┘
       │
       │ 7. For each rule:
       │    executeEmailAction()
       ▼
┌──────────────────────────┐
│  Email Service           │
│  1. Get template         │
│  2. Replace {{variables}}│
│  3. Send via Gmail API   │
│  4. Log to EmailLog      │
└──────┬───────────────────┘
       │
       │ 8. Email sent
       ▼
┌──────────────────────────┐
│  Return Response         │
│  { lead, deal }          │
└──────┬───────────────────┘
       │
       │ 9. Update UI
       ▼
┌──────────────────────────┐
│  Frontend                │
│  - Show success toast    │
│  - Refresh leads list    │
│  - Close dialog          │
└──────────────────────────┘
```

### 7.3 Document Upload Flow

```
┌─────────────┐
│  Frontend   │
│  Lead Dialog│
└──────┬──────┘
       │
       │ 1. User selects file
       │    POST /api/documents/{entityType}/{entityId}
       │    Content-Type: multipart/form-data
       ▼
┌──────────────────────┐
│  Multer Middleware   │
│  - Parse form-data   │
│  - Save to disk      │
│  - Validate size     │
└──────┬───────────────┘
       │
       │ 2. File saved to:
       │    documents/Lead/{leadId}/filename
       ▼
┌──────────────────────┐
│  Document Route      │
│  routes/documents.js │
└──────┬───────────────┘
       │
       │ 3. Create Document record
       ▼
┌──────────────────────┐
│  Prisma              │
│  document.create({   │
│    fileName, size,   │
│    filePath, ...     │
│  })                  │
└──────┬───────────────┘
       │
       │ 4. Return document metadata
       ▼
┌──────────────────────┐
│  Frontend            │
│  - Update UI         │
│  - Show new file     │
└──────────────────────┘
```

### 7.4 Sales Forecast Data Flow

```
┌─────────────┐
│  Frontend   │
│  SalesForecast│
│  Page       │
└──────┬──────┘
       │
       │ 1. GET /api/sales-forecast
       ▼
┌──────────────────────┐
│  Forecast Route      │
└──────┬───────────────┘
       │
       │ 2. Call forecastService
       ▼
┌──────────────────────────────┐
│  Sales Forecast Service      │
│  services/salesForecast.js   │
└──────┬───────────────────────┘
       │
       │ 3. Multiple database queries
       ├──┬──┬──┬──────────────┐
       │  │  │  │              │
       ▼  ▼  ▼  ▼              ▼
    Deals Leads Tasks Users Revenue
       │  │  │  │      by month
       └──┴──┴──┴──────┘
       │
       │ 4. Calculate:
       │    - Revenue trends
       │    - Pipeline by stage
       │    - Team performance
       │    - Aging analysis
       ▼
┌──────────────────────────────┐
│  Format Response             │
│  {                           │
│    revenueTrends: [...],     │
│    pipelineByStage: [...],   │
│    teamPerformance: [...],   │
│    agingAnalysis: [...]      │
│  }                           │
└──────┬───────────────────────┘
       │
       │ 5. Return JSON
       ▼
┌──────────────────────────────┐
│  Frontend                    │
│  - Parse data                │
│  - Render charts (Recharts) │
│  - Show metrics              │
└──────────────────────────────┘
```

---

## 8. File & Folder Structure

### 8.1 Frontend Files Explained

| File/Folder | Purpose | Key Responsibilities |
|-------------|---------|---------------------|
| `src/main.tsx` | App entry point | Render root React component, setup providers |
| `src/App.tsx` | Root component | Router setup, auth context, global layout |
| `src/lib/api.ts` | API client | HTTP requests, auth headers, error handling |
| `src/contexts/AuthContext.tsx` | Auth state | Login, logout, user state, JWT management |
| `src/pages/*.tsx` | Route pages | Full page components mapped to URLs |
| `src/components/ui/*.tsx` | Base UI | Reusable shadcn components |
| `src/components/settings/*.tsx` | Settings features | Automation, vector data, profile settings |
| `src/types/*.ts` | TypeScript types | Interface definitions for type safety |
| `vite.config.ts` | Build config | Dev server, build settings, proxy |
| `tailwind.config.js` | CSS config | Tailwind customization, theme colors |

### 8.2 Backend Files Explained

| File/Folder | Purpose | Key Responsibilities |
|-------------|---------|---------------------|
| `server.js` | Server entry | Express app setup, middleware registration, port binding |
| `routes/*.js` | API endpoints | Route handlers, request validation, response formatting |
| `services/*.js` | Business logic | Complex operations, data processing, external API calls |
| `middleware/auth.js` | Security | JWT verification, role-based authorization |
| `middleware/upload.js` | File handling | Multer config, file validation, storage paths |
| `prisma/schema.prisma` | Database schema | Model definitions, relations, indexes |
| `prisma/migrations/` | DB migrations | Version-controlled schema changes |
| `scripts/ingestDocuments.js` | Utility | Vector DB ingestion, batch processing |

### 8.3 Configuration Files

| File | Purpose | Key Settings |
|------|---------|-------------|
| `package.json` | Dependencies | npm packages, scripts, versions |
| `.env` | Environment vars | DB URL, JWT secret, Gmail credentials |
| `.gitignore` | Git exclusions | node_modules, .env, uploads |
| `tsconfig.json` | TypeScript | Compiler options, paths |
| `postcss.config.js` | CSS processing | Tailwind plugins |

---

## 9. Feature-Specific Flows

### 9.1 Email Automation Architecture

```
Trigger Event (Lead Created/Stage Changed)
         ↓
┌────────────────────────────────────────────┐
│  automationService.triggerAutomation()     │
│  - Event: 'lead.created' or               │
│    'lead.stage_changed'                    │
│  - Data: { id, name, email, company, ... } │
│  - User: Current authenticated user        │
└────────┬───────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  Query Enabled Automation Rules            │
│  SELECT * FROM AutomationRule              │
│  WHERE triggerEvent = event                │
│    AND isEnabled = true                    │
└────────┬───────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  For Each Rule: Check Conditions           │
│  - Stage change: fromStage & toStage match?│
│  - Other conditions from triggerConditions │
└────────┬───────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  executeEmailAction(rule, data, user)      │
│  1. Get template (custom or default)       │
│  2. Prepare variables object               │
│  3. replaceTemplateVariables()             │
│  4. Call emailService.sendEmail()          │
└────────┬───────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  emailService.sendEmail()                  │
│  1. Get user's Google OAuth tokens         │
│  2. Create EmailLog (pending status)       │
│  3. Get Gmail OAuth2 transporter           │
│  4. Send email via Gmail API               │
│  5. Update EmailLog (sent status)          │
└────────────────────────────────────────────┘
```

**Template Variable Replacement:**
```javascript
// Input template
"Hi {{name}}, welcome from {{company}}!"

// Variables object
{ name: "John Doe", company: "Acme Corp" }

// replaceTemplateVariables() function
- Find all {{variable}} patterns
- Replace with actual values
- Return processed string

// Output
"Hi John Doe, welcome from Acme Corp!"
```

### 9.2 Document Management Architecture

**Upload Process:**
```
1. Frontend: FormData with file + metadata
   ↓
2. Backend: Multer middleware intercepts
   ↓
3. Multer: Determines destination
   - entityType = 'Lead'
   - entityId = 'abc-123'
   - Destination: documents/Lead/abc-123/
   ↓
4. Multer: Saves file to disk
   - Filename: timestamp-originalname.ext
   ↓
5. Route handler: req.file contains file info
   ↓
6. Create Document record in database
   - Store: fileName, fileSize, mimeType, filePath
   - Link: entityType, entityId, userId
   ↓
7. Return document metadata to frontend
   ↓
8. Frontend: Display in documents list
```

**Download Process:**
```
1. GET /api/documents/:id/download
   ↓
2. Query document from database
   ↓
3. Check authorization (user owns document?)
   ↓
4. Read file from disk using filePath
   ↓
5. Set headers: Content-Type, Content-Disposition
   ↓
6. Stream file to response
   ↓
7. Browser downloads file
```

### 9.3 Vector Database Integration

```
┌──────────────────────────────────────┐
│  Frontend: Upload file to vector DB  │
│  POST /api/vector-data/upload        │
│  FormData with file                  │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  Multer: Save to knowledge_base/     │
│  - Max size: 50MB                    │
│  - Sanitized filename                │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  Create VectorDataUpload record      │
│  - Track upload metadata             │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  User clicks "Run Ingest Process"    │
│  POST /api/vector-data/ingest        │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  Spawn background process            │
│  node scripts/ingestDocuments.js     │
│    --clear                           │
│  - Detached: true                    │
│  - Returns immediately               │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  Background Script:                  │
│  1. Read all files in knowledge_base/│
│  2. Parse content (PDF, TXT, MD)     │
│  3. Split into chunks                │
│  4. Generate embeddings              │
│  5. Store in vector database         │
└──────────────────────────────────────┘
```

---

## 10. Security & Authentication

### 10.1 Authentication Flow

**JWT (JSON Web Tokens):**
```
┌─────────────────────────────────────┐
│  Token Structure                     │
├─────────────────────────────────────┤
│  Header:                             │
│    { alg: "HS256", typ: "JWT" }     │
├─────────────────────────────────────┤
│  Payload:                            │
│    {                                 │
│      userId: "uuid",                │
│      email: "user@example.com",     │
│      role: "ADMIN",                 │
│      iat: 1234567890,               │
│      exp: 1234567890                │
│    }                                 │
├─────────────────────────────────────┤
│  Signature:                          │
│    HMAC-SHA256(                      │
│      base64(header) + "." +         │
│      base64(payload),               │
│      secret                          │
│    )                                 │
└─────────────────────────────────────┘
```

**Token Lifecycle:**
1. User logs in → Server generates JWT
2. Client stores in localStorage
3. Every request includes: `Authorization: Bearer <token>`
4. Server validates signature and expiration
5. Server extracts user info from payload
6. Server checks user role for authorization

### 10.2 Authorization Levels

```
┌──────────┬────────────────────────────────┐
│   Role   │         Permissions            │
├──────────┼────────────────────────────────┤
│  ADMIN   │  - All MANAGER permissions     │
│          │  - User management             │
│          │  - System settings             │
│          │  - Backend restart             │
│          │  - Vector DB management        │
├──────────┼────────────────────────────────┤
│ MANAGER  │  - All AGENT permissions       │
│          │  - Automation rules            │
│          │  - Team analytics              │
│          │  - Bulk operations             │
├──────────┼────────────────────────────────┤
│  AGENT   │  - Create/edit own leads       │
│          │  - View assigned items         │
│          │  - Upload documents            │
│          │  - Send emails                 │
├──────────┼────────────────────────────────┤
│  VIEWER  │  - Read-only access            │
│          │  - View dashboards             │
│          │  - View reports                │
└──────────┴────────────────────────────────┘
```

### 10.3 Security Best Practices Implemented

1. **Password Security:**
   - Bcrypt hashing with salt
   - No plain-text storage
   - Minimum length requirements

2. **Token Security:**
   - Signed with secret key
   - Expiration time set
   - Refresh mechanism

3. **API Security:**
   - CORS configured
   - Rate limiting (can be added)
   - Input validation
   - SQL injection prevention (Prisma)

4. **File Upload Security:**
   - File size limits
   - File type validation
   - Unique storage paths
   - Access control

---

## 11. API Documentation

### 11.1 Authentication Endpoints

```
POST /api/auth/register
  Body: { email, password, name, role }
  Response: { user, token }

POST /api/auth/login
  Body: { email, password }
  Response: { user, token }

GET /api/auth/me
  Headers: Authorization: Bearer <token>
  Response: { user }
```

### 11.2 Lead Endpoints

```
GET /api/leads
  Query: ?status=new&assignedTo=userId
  Headers: Authorization
  Response: Lead[]

POST /api/leads
  Headers: Authorization
  Body: { name, email, company, phone, status, ... }
  Response: { lead, deal }

PUT /api/leads/:id
  Headers: Authorization
  Body: { name?, email?, status?, ... }
  Response: Lead
  Triggers: Automation if status changed

DELETE /api/leads/:id
  Headers: Authorization
  Response: { message }
```

### 11.3 Automation Endpoints

```
GET /api/automation/rules
  Headers: Authorization
  Response: AutomationRule[]

POST /api/automation/rules
  Headers: Authorization
  Body: {
    name, type, triggerEvent, actionType,
    emailSubject?, emailTemplate?,
    fromStage?, toStage?, isEnabled
  }
  Response: AutomationRule

PUT /api/automation/rules/:id
  Headers: Authorization
  Body: { same as POST }
  Response: AutomationRule

PATCH /api/automation/rules/:id/toggle
  Headers: Authorization
  Body: { isEnabled: boolean }
  Response: AutomationRule

DELETE /api/automation/rules/:id
  Headers: Authorization
  Response: { message }

GET /api/automation/templates
  Headers: Authorization
  Response: { lead_created: {...}, stage_change: {...} }
```

### 11.4 Document Endpoints

```
POST /api/documents/:entityType/:entityId
  Headers: Authorization, Content-Type: multipart/form-data
  Body: FormData with 'file'
  Response: Document

GET /api/documents/:entityType/:entityId
  Headers: Authorization
  Response: Document[]

GET /api/documents/:id/download
  Headers: Authorization
  Response: File stream

DELETE /api/documents/:id
  Headers: Authorization
  Response: { message }
```

### 11.5 Sales Forecast Endpoints

```
GET /api/sales-forecast
  Headers: Authorization
  Response: {
    revenueTrends: Array<{ month, revenue }>,
    pipelineByStage: Array<{ stage, value, count }>,
    teamPerformance: Array<{ name, revenue, deals }>,
    agingAnalysis: Array<{ category, count, value }>
  }
```

### 11.6 Vector Data Endpoints

```
POST /api/vector-data/upload
  Headers: Authorization (ADMIN only)
  Body: FormData with 'file'
  Response: { message, file }

GET /api/vector-data/uploads
  Headers: Authorization (ADMIN only)
  Response: VectorDataUpload[]

POST /api/vector-data/ingest
  Headers: Authorization (ADMIN only)
  Response: { message, status }
  Note: Runs in background

POST /api/vector-data/restart-backend
  Headers: Authorization (ADMIN only)
  Response: { message, status }
  Note: Restarts server after 1s delay
```

---

## 12. Development Workflow

### 12.1 Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd bharat-crm

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your values

# 4. Setup database
npx prisma migrate dev
npx prisma generate

# 5. Install frontend dependencies
cd ../
npm install

# 6. Start development servers
# Terminal 1 (Backend):
cd backend
npm run dev

# Terminal 2 (Frontend):
npm run dev

# Access app at: http://localhost:5173
```

### 12.2 Database Migrations

```bash
# Create new migration
cd backend
npx prisma migrate dev --name description_of_change

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (DB GUI)
npx prisma studio
```

### 12.3 Adding New Features

**Step-by-step process:**

1. **Database Changes:**
   ```bash
   # Edit backend/prisma/schema.prisma
   # Add new model or fields
   npx prisma migrate dev --name add_new_feature
   ```

2. **Backend API:**
   ```bash
   # Create route: backend/routes/newFeature.js
   # Create service: backend/services/newFeature.js
   # Register route in server.js
   ```

3. **Frontend Components:**
   ```bash
   # Create page: src/pages/NewFeature.tsx
   # Create components: src/components/newFeature/
   # Add route in App.tsx
   ```

4. **Types:**
   ```bash
   # Add TypeScript types: src/types/newFeature.ts
   ```

---

## 13. Deployment Architecture

### 13.1 Production Environment

```
┌─────────────────────────────────────────────┐
│            Load Balancer / CDN              │
│          (Nginx / Cloudflare)               │
└──────────┬─────────────────────┬────────────┘
           │                     │
┌──────────▼──────────┐   ┌──────▼─────────────┐
│   Static Assets     │   │   API Server       │
│   (Frontend Build)  │   │   (Node.js)        │
│   - React SPA       │   │   - Express        │
│   - JS/CSS bundles  │   │   - Port 5000      │
└─────────────────────┘   └──────┬─────────────┘
                                 │
                          ┌──────▼─────────────┐
                          │   PostgreSQL       │
                          │   (Production DB)  │
                          └────────────────────┘
```

### 13.2 Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
GMAIL_USER=email@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
PORT=5000
NODE_ENV=production
```

**Frontend:**
```bash
VITE_API_URL=https://api.yourcrm.com
```

---

## 14. Performance Considerations

### 14.1 Frontend Optimization

- **Code Splitting:** React.lazy() for route-based splitting
- **Lazy Loading:** Load components on demand
- **Memoization:** useMemo, useCallback for expensive operations
- **Virtual Scrolling:** For large lists (can be added)
- **Image Optimization:** Compressed assets
- **Bundle Size:** Tree-shaking, minification

### 14.2 Backend Optimization

- **Database Indexing:** Key fields indexed
- **Query Optimization:** Select only needed fields
- **Connection Pooling:** Prisma manages connections
- **Caching:** Can add Redis for frequently accessed data
- **Background Jobs:** File processing, email sending
- **Rate Limiting:** Protect against abuse

### 14.3 Database Optimization

- **Indexes:** All foreign keys and frequently queried fields
- **Efficient Relations:** Use include/select wisely
- **Pagination:** Limit large result sets
- **Transactions:** Atomic operations for data integrity
- **Soft Deletes:** Can be added for data recovery

---

## 15. Testing Strategy

### 15.1 Recommended Tests

**Backend:**
- Unit tests for services
- Integration tests for routes
- Database tests with test DB
- Email sending mocks

**Frontend:**
- Component tests (React Testing Library)
- Integration tests (user flows)
- E2E tests (Cypress/Playwright)

**Example Test Structure:**
```
backend/
  __tests__/
    services/
      automation.test.js
      email.test.js
    routes/
      leads.test.js

src/
  __tests__/
    components/
      LeadDialog.test.tsx
    pages/
      Dashboard.test.tsx
```

---

## 16. Monitoring & Logging

### 16.1 Current Logging

- Console logs with emojis for visual parsing
- Error logging in catch blocks
- Email send/fail logging to database

### 16.2 Recommended Additions

- **Winston/Pino:** Structured logging
- **Sentry:** Error tracking
- **PM2:** Process management and logs
- **Database Query Logging:** Prisma debug mode
- **Analytics:** User behavior tracking

---

## Conclusion

This architecture document provides a comprehensive overview of the Bharat CRM system. The application follows industry best practices with:

- Clear separation of concerns
- Type-safe development (TypeScript)
- Secure authentication and authorization
- Scalable file storage
- Background job processing
- Modular, maintainable code structure

For questions or clarifications, refer to specific sections or contact the development team.

**Document Version:** 1.0
**Last Updated:** December 2025
**Maintained By:** Development Team
