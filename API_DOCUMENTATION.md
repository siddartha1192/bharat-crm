# Bharat CRM - API Documentation

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [User Management APIs](#user-management-apis)
3. [Leads APIs](#leads-apis)
4. [Contacts APIs](#contacts-apis)
5. [Deals APIs](#deals-apis)
6. [Tasks APIs](#tasks-apis)
7. [Invoices APIs](#invoices-apis)
8. [Pipeline Stage APIs](#pipeline-stage-apis)
9. [Email APIs](#email-apis)
10. [Calendar Events APIs](#calendar-events-apis)
11. [WhatsApp APIs](#whatsapp-apis)
12. [AI Assistant APIs](#ai-assistant-apis)
13. [Search APIs](#search-apis)
14. [Teams & Departments APIs](#teams-departments-apis)
15. [Guide: Adding New Field to Leads Form](#guide-adding-new-field-to-leads-form)

---

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require authentication using JWT Bearer tokens.

**Authentication Header:**
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication APIs

### 1. Register New User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123",
  "name": "John Doe",
  "company": "Acme Corp",
  "role": "AGENT"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "company": "Acme Corp",
    "role": "AGENT",
    "isActive": true,
    "createdAt": "2024-12-05T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "message": "Registration successful"
}
```

**Validation:**
- Email is required and must be unique
- Password must be at least 6 characters
- Name is required
- Role: ADMIN | MANAGER | AGENT | VIEWER (default: AGENT)

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "company": "Acme Corp",
    "role": "AGENT",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "message": "Login successful"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

---

### 3. Get Current User

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "company": "Acme Corp",
  "role": "AGENT",
  "isActive": true,
  "googleProfilePic": "https://...",
  "department": {
    "id": "dept-uuid",
    "name": "Sales"
  },
  "team": {
    "id": "team-uuid",
    "name": "Enterprise Sales"
  },
  "createdAt": "2024-12-05T10:30:00Z"
}
```

---

### 4. Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "token": "new_access_token_here",
  "refreshToken": "new_refresh_token_here"
}
```

---

### 5. Logout

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## User Management APIs

### 1. Get All Users

**Endpoint:** `GET /users`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** MANAGER or higher

**Response (200 OK):**
```json
[
  {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "AGENT",
    "isActive": true,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z"
  }
]
```

**Note:** Returns all users in the system. Ordered by creation date (newest first).

---

### 2. Get Single User

**Endpoint:** `GET /users/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:**
- Users can view their own profile (any role)
- MANAGER and ADMIN can view any user profile

**Response (200 OK):**
```json
{
  "id": "user-uuid-1",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "AGENT",
  "isActive": true,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z"
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Insufficient permissions"
}
```

---

### 3. Create New User

**Endpoint:** `POST /users`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** ADMIN only

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "role": "AGENT"
}
```

**Required Fields:**
- `name` (String): Full name of the user
- `email` (String): Unique email address
- `role` (String): ADMIN | MANAGER | AGENT | VIEWER

**Response (201 Created):**
```json
{
  "message": "User created successfully. Welcome email sent with instructions.",
  "user": {
    "id": "user-uuid-2",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "AGENT",
    "isActive": true,
    "createdAt": "2024-12-05T11:00:00Z",
    "updatedAt": "2024-12-05T11:00:00Z"
  }
}
```

**Important Notes:**
- User is created without a password initially
- A welcome email is automatically sent with instructions to set password via "Forgot Password" flow
- Welcome email includes role description and getting started instructions
- Email service failures do not prevent user creation

**Error Response (400 Bad Request):**
```json
{
  "error": "User with this email already exists"
}
```

---

### 4. Update User Profile

**Endpoint:** `PUT /users/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Permissions:**
- Users can update their own profile (name, email)
- ADMIN can update any user profile

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "user-uuid-1",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "role": "AGENT",
    "isActive": true,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T12:00:00Z"
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "You can only update your own profile"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Email already in use"
}
```

---

### 5. Update User Role

**Endpoint:** `PUT /users/:id/role`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** ADMIN only

**Request Body:**
```json
{
  "role": "MANAGER"
}
```

**Valid Roles:**
- `ADMIN` - Full system access
- `MANAGER` - Manage teams and view analytics
- `AGENT` - Create and manage CRM data
- `VIEWER` - Read-only access

**Response (200 OK):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "MANAGER",
    "isActive": true,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T12:30:00Z"
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "You cannot change your own role"
}
```

---

### 6. Update User Active Status

**Endpoint:** `PUT /users/:id/status`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** ADMIN only

**Request Body:**
```json
{
  "isActive": false
}
```

**Parameters:**
- `isActive` (Boolean, **required**): `true` to activate, `false` to deactivate

**Response (200 OK):**
```json
{
  "message": "User deactivated successfully",
  "user": {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "AGENT",
    "isActive": false,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T13:00:00Z"
  }
}
```

**Important Notes:**
- Deactivated users cannot login
- Cannot deactivate your own account
- User data is preserved (not deleted)

**Error Response (403 Forbidden):**
```json
{
  "error": "You cannot deactivate your own account"
}
```

---

### 7. Delete User

**Endpoint:** `DELETE /users/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** ADMIN only

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

**Important Notes:**
- **Permanent deletion** - This action cannot be undone
- **Cascade delete** - All user's CRM data (leads, contacts, deals, tasks, etc.) will be deleted
- Cannot delete your own account
- Consider deactivating users instead of deleting them to preserve data

**Error Response (403 Forbidden):**
```json
{
  "error": "You cannot delete your own account"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "User not found"
}
```

---

## Leads APIs

### 1. Get All Leads

**Endpoint:** `GET /leads`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): new | contacted | qualified | proposal | negotiation | won | lost | all
- `assignedTo` (optional): Filter by assignee name

**Example Request:**
```
GET /leads?status=new&assignedTo=John Doe
```

**Response (200 OK):**
```json
[
  {
    "id": "lead-uuid-1",
    "name": "Jane Smith",
    "company": "Tech Corp",
    "email": "jane@techcorp.com",
    "phone": "+91 98765 43210",
    "whatsapp": "+91 98765 43210",
    "source": "web-form",
    "status": "new",
    "priority": "high",
    "estimatedValue": 50000,
    "assignedTo": "John Doe",
    "notes": "Interested in enterprise plan",
    "tags": ["enterprise", "hot-lead"],
    "website": "https://techcorp.com",
    "linkedIn": "https://linkedin.com/in/janesmith",
    "twitter": null,
    "facebook": null,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "lastContactedAt": null,
    "nextFollowUpAt": "2024-12-06T10:00:00Z",
    "userId": "user-uuid"
  }
]
```

---

### 2. Get Single Lead

**Endpoint:** `GET /leads/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "lead-uuid-1",
  "name": "Jane Smith",
  "company": "Tech Corp",
  "email": "jane@techcorp.com",
  "phone": "+91 98765 43210",
  "whatsapp": "+91 98765 43210",
  "source": "web-form",
  "status": "new",
  "priority": "high",
  "estimatedValue": 50000,
  "assignedTo": "John Doe",
  "notes": "Interested in enterprise plan",
  "tags": ["enterprise", "hot-lead"],
  "website": "https://techcorp.com",
  "linkedIn": "https://linkedin.com/in/janesmith",
  "twitter": null,
  "facebook": null,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "lastContactedAt": null,
  "nextFollowUpAt": "2024-12-06T10:00:00Z",
  "userId": "user-uuid"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Lead not found"
}
```

---

### 3. Create New Lead

**Endpoint:** `POST /leads`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "company": "Tech Corp",
  "email": "jane@techcorp.com",
  "phone": "+91 98765 43210",
  "whatsapp": "+91 98765 43210",
  "source": "web-form",
  "status": "new",
  "priority": "high",
  "estimatedValue": 50000,
  "assignedTo": "John Doe",
  "notes": "Interested in enterprise plan",
  "tags": ["enterprise", "hot-lead"],
  "website": "https://techcorp.com",
  "linkedIn": "https://linkedin.com/in/janesmith",
  "twitter": "",
  "facebook": ""
}
```

**Required Fields:**
- `name` (String)
- `company` (String)
- `email` (String)
- `phone` (String)
- `source` (String): web-form | whatsapp | call | email | referral | social-media | missed-call
- `status` (String): new | contacted | qualified | proposal | negotiation | won | lost
- `priority` (String): low | medium | high | urgent
- `estimatedValue` (Number)
- `assignedTo` (String)

**Optional Fields:**
- `whatsapp` (String)
- `notes` (String, default: "")
- `tags` (Array of Strings, default: [])
- `website` (String)
- `linkedIn` (String)
- `twitter` (String)
- `facebook` (String)
- `lastContactedAt` (DateTime)
- `nextFollowUpAt` (DateTime)

**Response (201 Created):**
```json
{
  "id": "lead-uuid-1",
  "name": "Jane Smith",
  "company": "Tech Corp",
  "email": "jane@techcorp.com",
  "phone": "+91 98765 43210",
  "whatsapp": "+91 98765 43210",
  "source": "web-form",
  "status": "new",
  "priority": "high",
  "estimatedValue": 50000,
  "assignedTo": "John Doe",
  "notes": "Interested in enterprise plan",
  "tags": ["enterprise", "hot-lead"],
  "website": "https://techcorp.com",
  "linkedIn": "https://linkedin.com/in/janesmith",
  "twitter": null,
  "facebook": null,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "lastContactedAt": null,
  "nextFollowUpAt": null,
  "userId": "user-uuid"
}
```

---

### 4. Update Lead

**Endpoint:** `PUT /leads/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "contacted",
  "lastContactedAt": "2024-12-05T14:30:00Z",
  "nextFollowUpAt": "2024-12-07T10:00:00Z",
  "notes": "Interested in enterprise plan. Scheduled demo for next week."
}
```

**Note:** You can send partial updates. Only fields you want to update need to be included.

**Response (200 OK):**
```json
{
  "id": "lead-uuid-1",
  "name": "Jane Smith",
  "company": "Tech Corp",
  "email": "jane@techcorp.com",
  "phone": "+91 98765 43210",
  "whatsapp": "+91 98765 43210",
  "source": "web-form",
  "status": "contacted",
  "priority": "high",
  "estimatedValue": 50000,
  "assignedTo": "John Doe",
  "notes": "Interested in enterprise plan. Scheduled demo for next week.",
  "tags": ["enterprise", "hot-lead"],
  "website": "https://techcorp.com",
  "linkedIn": "https://linkedin.com/in/janesmith",
  "twitter": null,
  "facebook": null,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T14:35:00Z",
  "lastContactedAt": "2024-12-05T14:30:00Z",
  "nextFollowUpAt": "2024-12-07T10:00:00Z",
  "userId": "user-uuid"
}
```

---

### 5. Delete Lead

**Endpoint:** `DELETE /leads/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Lead deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Lead not found"
}
```

---

### 6. Get Lead Stats

**Endpoint:** `GET /leads/stats/summary`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "total": 150,
  "new": 45,
  "qualified": 30,
  "totalValue": 2500000
}
```

---

## Contacts APIs

### 1. Get All Contacts

**Endpoint:** `GET /contacts`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (optional): customer | prospect | partner | vendor | all
- `assignedTo` (optional): Filter by assignee name

**Example Request:**
```
GET /contacts?type=customer&assignedTo=John Doe
```

**Response (200 OK):**
```json
[
  {
    "id": "contact-uuid-1",
    "name": "Rajesh Kumar",
    "company": "Tech Solutions Pvt Ltd",
    "designation": "CEO",
    "email": "rajesh@techsolutions.com",
    "phone": "+91 98765 43210",
    "alternatePhone": "+91 87654 32109",
    "whatsapp": "+91 98765 43210",
    "type": "customer",
    "industry": "technology",
    "companySize": "50-200",
    "gstNumber": "29ABCDE1234F1Z5",
    "panNumber": "ABCDE1234F",
    "address": {
      "street": "123 MG Road",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "country": "India"
    },
    "website": "https://techsolutions.com",
    "linkedIn": "https://linkedin.com/in/rajeshkumar",
    "notes": "Key decision maker",
    "tags": ["vip", "enterprise"],
    "assignedTo": "John Doe",
    "lifetimeValue": 500000,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "userId": "user-uuid"
  }
]
```

---

### 2. Get Single Contact

**Endpoint:** `GET /contacts/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "contact-uuid-1",
  "name": "Rajesh Kumar",
  "company": "Tech Solutions Pvt Ltd",
  "designation": "CEO",
  "email": "rajesh@techsolutions.com",
  "phone": "+91 98765 43210",
  "alternatePhone": "+91 87654 32109",
  "whatsapp": "+91 98765 43210",
  "type": "customer",
  "industry": "technology",
  "companySize": "50-200",
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "address": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "website": "https://techsolutions.com",
  "linkedIn": "https://linkedin.com/in/rajeshkumar",
  "notes": "Key decision maker",
  "tags": ["vip", "enterprise"],
  "assignedTo": "John Doe",
  "lifetimeValue": 500000,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "userId": "user-uuid"
}
```

---

### 3. Create New Contact

**Endpoint:** `POST /contacts`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Rajesh Kumar",
  "company": "Tech Solutions Pvt Ltd",
  "designation": "CEO",
  "email": "rajesh@techsolutions.com",
  "phone": "+91 98765 43210",
  "alternatePhone": "+91 87654 32109",
  "whatsapp": "+91 98765 43210",
  "type": "customer",
  "industry": "technology",
  "companySize": "50-200",
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "address": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "website": "https://techsolutions.com",
  "linkedIn": "https://linkedin.com/in/rajeshkumar",
  "notes": "Key decision maker",
  "tags": ["vip", "enterprise"],
  "assignedTo": "John Doe",
  "lifetimeValue": 500000
}
```

**Required Fields:**
- `name` (String)
- `company` (String)
- `designation` (String)
- `email` (String)
- `phone` (String)
- `type` (String): customer | prospect | partner | vendor
- `industry` (String): technology | manufacturing | retail | export | services | textile | food | healthcare | other
- `companySize` (String)
- `assignedTo` (String)

**Optional Fields:**
- `alternatePhone` (String)
- `whatsapp` (String)
- `gstNumber` (String)
- `panNumber` (String)
- `address` (Object with street, city, state, pincode, country)
- `website` (String)
- `linkedIn` (String)
- `notes` (String, default: "")
- `tags` (Array of Strings, default: [])
- `lifetimeValue` (Number, default: 0)

**Response (201 Created):**
```json
{
  "id": "contact-uuid-1",
  "name": "Rajesh Kumar",
  "company": "Tech Solutions Pvt Ltd",
  "designation": "CEO",
  "email": "rajesh@techsolutions.com",
  "phone": "+91 98765 43210",
  "alternatePhone": "+91 87654 32109",
  "whatsapp": "+91 98765 43210",
  "type": "customer",
  "industry": "technology",
  "companySize": "50-200",
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "address": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "website": "https://techsolutions.com",
  "linkedIn": "https://linkedin.com/in/rajeshkumar",
  "notes": "Key decision maker",
  "tags": ["vip", "enterprise"],
  "assignedTo": "John Doe",
  "lifetimeValue": 500000,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "userId": "user-uuid"
}
```

---

### 4. Update Contact

**Endpoint:** `PUT /contacts/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "lifetimeValue": 750000,
  "notes": "Key decision maker. Increased purchase by 50%."
}
```

**Response (200 OK):**
```json
{
  "id": "contact-uuid-1",
  "name": "Rajesh Kumar",
  "company": "Tech Solutions Pvt Ltd",
  "designation": "CEO",
  "email": "rajesh@techsolutions.com",
  "phone": "+91 98765 43210",
  "alternatePhone": "+91 87654 32109",
  "whatsapp": "+91 98765 43210",
  "type": "customer",
  "industry": "technology",
  "companySize": "50-200",
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "address": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "website": "https://techsolutions.com",
  "linkedIn": "https://linkedin.com/in/rajeshkumar",
  "notes": "Key decision maker. Increased purchase by 50%.",
  "tags": ["vip", "enterprise"],
  "assignedTo": "John Doe",
  "lifetimeValue": 750000,
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T15:30:00Z",
  "userId": "user-uuid"
}
```

---

### 5. Delete Contact

**Endpoint:** `DELETE /contacts/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Contact deleted successfully"
}
```

---

### 6. Get Contact Stats

**Endpoint:** `GET /contacts/stats/summary`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "total": 250,
  "customers": 150,
  "prospects": 80,
  "totalValue": 5000000
}
```

---

## Deals APIs

### 1. Get All Deals

**Endpoint:** `GET /deals`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `stage` (optional): lead | qualified | proposal | negotiation | closed-won | closed-lost | all

**Example Request:**
```
GET /deals?stage=negotiation
```

**Response (200 OK):**
```json
[
  {
    "id": "deal-uuid-1",
    "title": "Enterprise Software License",
    "company": "Tech Solutions Pvt Ltd",
    "contactName": "Rajesh Kumar",
    "contactId": "contact-uuid-1",
    "value": 500000,
    "stage": "negotiation",
    "probability": 75,
    "expectedCloseDate": "2024-12-15T00:00:00Z",
    "assignedTo": "John Doe",
    "notes": "Negotiating payment terms",
    "tags": ["enterprise", "software"],
    "createdAt": "2024-12-01T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "userId": "user-uuid"
  }
]
```

---

### 2. Get Single Deal

**Endpoint:** `GET /deals/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "deal-uuid-1",
  "title": "Enterprise Software License",
  "company": "Tech Solutions Pvt Ltd",
  "contactName": "Rajesh Kumar",
  "contactId": "contact-uuid-1",
  "value": 500000,
  "stage": "negotiation",
  "probability": 75,
  "expectedCloseDate": "2024-12-15T00:00:00Z",
  "assignedTo": "John Doe",
  "notes": "Negotiating payment terms",
  "tags": ["enterprise", "software"],
  "createdAt": "2024-12-01T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "userId": "user-uuid"
}
```

---

### 3. Create New Deal

**Endpoint:** `POST /deals`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Enterprise Software License",
  "company": "Tech Solutions Pvt Ltd",
  "contactName": "Rajesh Kumar",
  "contactId": "contact-uuid-1",
  "value": 500000,
  "stage": "qualified",
  "probability": 50,
  "expectedCloseDate": "2024-12-15T00:00:00Z",
  "assignedTo": "John Doe",
  "notes": "Interested in annual license",
  "tags": ["enterprise", "software"]
}
```

**Required Fields:**
- `title` (String)
- `company` (String)
- `contactName` (String)
- `value` (Number)
- `stage` (String): lead | qualified | proposal | negotiation | closed-won | closed-lost
- `probability` (Number): 0-100
- `expectedCloseDate` (DateTime)
- `assignedTo` (String)

**Optional Fields:**
- `contactId` (String): Link to existing contact
- `notes` (String, default: "")
- `tags` (Array of Strings, default: [])

**Response (201 Created):**
```json
{
  "id": "deal-uuid-1",
  "title": "Enterprise Software License",
  "company": "Tech Solutions Pvt Ltd",
  "contactName": "Rajesh Kumar",
  "contactId": "contact-uuid-1",
  "value": 500000,
  "stage": "qualified",
  "probability": 50,
  "expectedCloseDate": "2024-12-15T00:00:00Z",
  "assignedTo": "John Doe",
  "notes": "Interested in annual license",
  "tags": ["enterprise", "software"],
  "createdAt": "2024-12-01T10:30:00Z",
  "updatedAt": "2024-12-01T10:30:00Z",
  "userId": "user-uuid"
}
```

---

### 4. Update Deal

**Endpoint:** `PUT /deals/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "stage": "negotiation",
  "probability": 75,
  "notes": "Negotiating payment terms. Customer requested 30-day credit."
}
```

**Response (200 OK):**
```json
{
  "id": "deal-uuid-1",
  "title": "Enterprise Software License",
  "company": "Tech Solutions Pvt Ltd",
  "contactName": "Rajesh Kumar",
  "contactId": "contact-uuid-1",
  "value": 500000,
  "stage": "negotiation",
  "probability": 75,
  "expectedCloseDate": "2024-12-15T00:00:00Z",
  "assignedTo": "John Doe",
  "notes": "Negotiating payment terms. Customer requested 30-day credit.",
  "tags": ["enterprise", "software"],
  "createdAt": "2024-12-01T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "userId": "user-uuid"
}
```

---

### 5. Delete Deal

**Endpoint:** `DELETE /deals/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Deal deleted successfully"
}
```

---

## Tasks APIs

### 1. Get All Tasks

**Endpoint:** `GET /tasks`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): todo | in-progress | completed | all

**Example Request:**
```
GET /tasks?status=todo
```

**Response (200 OK):**
```json
[
  {
    "id": "task-uuid-1",
    "title": "Follow up with Tech Solutions",
    "description": "Discuss payment terms for enterprise license",
    "priority": "high",
    "status": "todo",
    "dueDate": "2024-12-06T10:00:00Z",
    "assignee": "John Doe",
    "tags": ["follow-up", "deal"],
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "completedAt": null,
    "userId": "user-uuid"
  }
]
```

---

### 2. Get Single Task

**Endpoint:** `GET /tasks/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "task-uuid-1",
  "title": "Follow up with Tech Solutions",
  "description": "Discuss payment terms for enterprise license",
  "priority": "high",
  "status": "todo",
  "dueDate": "2024-12-06T10:00:00Z",
  "assignee": "John Doe",
  "tags": ["follow-up", "deal"],
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "completedAt": null,
  "userId": "user-uuid"
}
```

---

### 3. Create New Task

**Endpoint:** `POST /tasks`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Follow up with Tech Solutions",
  "description": "Discuss payment terms for enterprise license",
  "priority": "high",
  "status": "todo",
  "dueDate": "2024-12-06T10:00:00Z",
  "assignee": "John Doe",
  "tags": ["follow-up", "deal"]
}
```

**Required Fields:**
- `title` (String)
- `priority` (String): low | medium | high | urgent
- `status` (String): todo | in-progress | completed
- `dueDate` (DateTime)
- `assignee` (String)

**Optional Fields:**
- `description` (String, default: "")
- `tags` (Array of Strings, default: [])

**Response (201 Created):**
```json
{
  "id": "task-uuid-1",
  "title": "Follow up with Tech Solutions",
  "description": "Discuss payment terms for enterprise license",
  "priority": "high",
  "status": "todo",
  "dueDate": "2024-12-06T10:00:00Z",
  "assignee": "John Doe",
  "tags": ["follow-up", "deal"],
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "completedAt": null,
  "userId": "user-uuid"
}
```

---

### 4. Update Task

**Endpoint:** `PUT /tasks/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "completed",
  "completedAt": "2024-12-05T14:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "id": "task-uuid-1",
  "title": "Follow up with Tech Solutions",
  "description": "Discuss payment terms for enterprise license",
  "priority": "high",
  "status": "completed",
  "dueDate": "2024-12-06T10:00:00Z",
  "assignee": "John Doe",
  "tags": ["follow-up", "deal"],
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T14:35:00Z",
  "completedAt": "2024-12-05T14:30:00Z",
  "userId": "user-uuid"
}
```

---

### 5. Delete Task

**Endpoint:** `DELETE /tasks/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Task deleted successfully"
}
```

---

## Invoices APIs

### 1. Get All Invoices

**Endpoint:** `GET /invoices`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): draft | sent | paid | overdue | cancelled | all

**Example Request:**
```
GET /invoices?status=sent
```

**Response (200 OK):**
```json
[
  {
    "id": "invoice-uuid-1",
    "invoiceNumber": "INV-2024-001",
    "customerName": "Tech Solutions Pvt Ltd",
    "customerEmail": "billing@techsolutions.com",
    "customerPhone": "+91 98765 43210",
    "customerGSTIN": "29ABCDE1234F1Z5",
    "customerAddress": "123 MG Road, Bangalore, Karnataka 560001",
    "companyName": "My Company",
    "companyGSTIN": "29XYZAB5678C1D2",
    "companyPAN": "ABCDE1234F",
    "companyAddress": "456 Church Street, Bangalore, Karnataka 560002",
    "items": [
      {
        "description": "Software License - Annual",
        "quantity": 1,
        "rate": 100000,
        "amount": 100000
      }
    ],
    "subtotal": 100000,
    "totalDiscount": 0,
    "cgst": 9000,
    "sgst": 9000,
    "igst": 0,
    "roundOff": 0,
    "totalTax": 18000,
    "total": 118000,
    "status": "sent",
    "dueDate": "2024-12-20T00:00:00Z",
    "paymentDate": null,
    "notes": "Payment terms: 15 days",
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "userId": "user-uuid"
  }
]
```

**Permissions:**
- ADMIN and MANAGER can view all invoices
- AGENT and VIEWER can only view their own invoices

---

### 2. Get Single Invoice

**Endpoint:** `GET /invoices/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "invoice-uuid-1",
  "invoiceNumber": "INV-2024-001",
  "customerName": "Tech Solutions Pvt Ltd",
  "customerEmail": "billing@techsolutions.com",
  "customerPhone": "+91 98765 43210",
  "customerGSTIN": "29ABCDE1234F1Z5",
  "customerAddress": "123 MG Road, Bangalore, Karnataka 560001",
  "companyName": "My Company",
  "companyGSTIN": "29XYZAB5678C1D2",
  "companyPAN": "ABCDE1234F",
  "companyAddress": "456 Church Street, Bangalore, Karnataka 560002",
  "items": [
    {
      "description": "Software License - Annual",
      "quantity": 1,
      "rate": 100000,
      "amount": 100000
    }
  ],
  "subtotal": 100000,
  "totalDiscount": 0,
  "cgst": 9000,
  "sgst": 9000,
  "igst": 0,
  "roundOff": 0,
  "totalTax": 18000,
  "total": 118000,
  "status": "sent",
  "dueDate": "2024-12-20T00:00:00Z",
  "paymentDate": null,
  "notes": "Payment terms: 15 days",
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z",
  "userId": "user-uuid"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Invoice not found"
}
```

---

### 3. Create New Invoice

**Endpoint:** `POST /invoices`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** AGENT or higher (VIEWER cannot create)

**Request Body:**
```json
{
  "invoiceNumber": "INV-2024-001",
  "customerName": "Tech Solutions Pvt Ltd",
  "customerEmail": "billing@techsolutions.com",
  "customerPhone": "+91 98765 43210",
  "customerGSTIN": "29ABCDE1234F1Z5",
  "customerAddress": "123 MG Road, Bangalore, Karnataka 560001",
  "companyName": "My Company",
  "companyGSTIN": "29XYZAB5678C1D2",
  "companyPAN": "ABCDE1234F",
  "companyAddress": "456 Church Street, Bangalore, Karnataka 560002",
  "items": [
    {
      "description": "Software License - Annual",
      "quantity": 1,
      "rate": 100000,
      "amount": 100000
    }
  ],
  "subtotal": 100000,
  "totalDiscount": 0,
  "cgst": 9000,
  "sgst": 9000,
  "igst": 0,
  "roundOff": 0,
  "totalTax": 18000,
  "total": 118000,
  "status": "draft",
  "dueDate": "2024-12-20T00:00:00Z",
  "notes": "Payment terms: 15 days"
}
```

**Required Fields:**
- `invoiceNumber` (String): Unique invoice number
- `customerName` (String): Customer's business name
- `customerEmail` (String): Customer's email address
- `customerAddress` (String): Customer's billing address
- `companyName` (String): Your company name
- `companyAddress` (String): Your company address
- `items` (Array): Array of line items with description, quantity, rate, amount
- `subtotal` (Number): Sum of all items before tax
- `total` (Number): Final amount including tax
- `status` (String): draft | sent | paid | overdue | cancelled
- `dueDate` (DateTime): Payment due date

**Optional Fields:**
- `customerPhone` (String)
- `customerGSTIN` (String): Customer's GST number
- `companyGSTIN` (String): Your company's GST number
- `companyPAN` (String): Your company's PAN number
- `totalDiscount` (Number, default: 0)
- `cgst` (Number, default: 0): Central GST
- `sgst` (Number, default: 0): State GST
- `igst` (Number, default: 0): Integrated GST
- `roundOff` (Number, default: 0)
- `totalTax` (Number): Auto-calculated if not provided
- `paymentDate` (DateTime): Date when payment received
- `notes` (String): Additional notes or terms

**Response (201 Created):**
```json
{
  "id": "invoice-uuid-1",
  "invoiceNumber": "INV-2024-001",
  "...": "..."
}
```

**Note:** The invoice uses Indian GST fields (CGST, SGST, IGST, GST numbers, PAN).

---

### 4. Update Invoice

**Endpoint:** `PUT /invoices/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** AGENT or higher

**Permissions:**
- ADMIN and MANAGER can update any invoice
- AGENT can only update their own invoices

**Request Body:** (Partial update supported)
```json
{
  "status": "paid",
  "paymentDate": "2024-12-10T00:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "id": "invoice-uuid-1",
  "invoiceNumber": "INV-2024-001",
  "status": "paid",
  "paymentDate": "2024-12-10T00:00:00Z",
  "...": "..."
}
```

---

### 5. Delete Invoice

**Endpoint:** `DELETE /invoices/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** MANAGER or higher (AGENT cannot delete)

**Response (200 OK):**
```json
{
  "message": "Invoice deleted successfully"
}
```

---

### 6. Get Invoice Stats

**Endpoint:** `GET /invoices/stats/summary`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "totalInvoices": 45,
  "paidAmount": 2500000,
  "pendingAmount": 500000,
  "overdueAmount": 150000
}
```

**Note:** Returns statistics for the logged-in user's invoices only.

---

## Pipeline Stage APIs

### 1. Get All Pipeline Stages

**Endpoint:** `GET /pipelineStages`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "stage-uuid-1",
    "name": "Lead",
    "slug": "lead",
    "color": "blue",
    "order": 1,
    "isDefault": true,
    "isActive": true,
    "userId": null,
    "createdAt": "2024-12-01T00:00:00Z",
    "updatedAt": "2024-12-01T00:00:00Z"
  },
  {
    "id": "stage-uuid-6",
    "name": "Discovery Call",
    "slug": "discovery-call",
    "color": "purple",
    "order": 6,
    "isDefault": false,
    "isActive": true,
    "userId": "user-uuid",
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z"
  }
]
```

**Note:** Returns both default system stages (userId: null) and user's custom stages (userId: user-id). Only active stages are returned.

---

### 2. Get Single Pipeline Stage

**Endpoint:** `GET /pipelineStages/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "stage-uuid-1",
  "name": "Lead",
  "slug": "lead",
  "color": "blue",
  "order": 1,
  "isDefault": true,
  "isActive": true,
  "userId": null,
  "createdAt": "2024-12-01T00:00:00Z",
  "updatedAt": "2024-12-01T00:00:00Z"
}
```

---

### 3. Create Custom Pipeline Stage

**Endpoint:** `POST /pipelineStages`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Discovery Call",
  "slug": "discovery-call",
  "color": "purple",
  "order": 6
}
```

**Required Fields:**
- `name` (String): Display name for the stage
- `slug` (String): Unique identifier (lowercase, hyphenated)

**Optional Fields:**
- `color` (String, default: "blue"): Color for visual identification
- `order` (Number): Display order (auto-assigned if not provided)

**Response (201 Created):**
```json
{
  "id": "stage-uuid-6",
  "name": "Discovery Call",
  "slug": "discovery-call",
  "color": "purple",
  "order": 6,
  "isDefault": false,
  "isActive": true,
  "userId": "user-uuid",
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T10:30:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "A stage with this slug already exists"
}
```

---

### 4. Update Pipeline Stage

**Endpoint:** `PUT /pipelineStages/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (Partial update supported)
```json
{
  "name": "Initial Discovery Call",
  "color": "indigo",
  "order": 5
}
```

**Updatable Fields:**
- `name` (String)
- `color` (String)
- `order` (Number)
- `isActive` (Boolean)

**Response (200 OK):**
```json
{
  "id": "stage-uuid-6",
  "name": "Initial Discovery Call",
  "slug": "discovery-call",
  "color": "indigo",
  "order": 5,
  "isDefault": false,
  "isActive": true,
  "userId": "user-uuid",
  "createdAt": "2024-12-05T10:30:00Z",
  "updatedAt": "2024-12-05T11:00:00Z"
}
```

**Important Notes:**
- Can only update your own custom stages
- Cannot update default system stages
- Cannot change the `slug` field after creation

**Error Response (403 Forbidden):**
```json
{
  "error": "Cannot modify default pipeline stages"
}
```

---

### 5. Delete Pipeline Stage

**Endpoint:** `DELETE /pipelineStages/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Pipeline stage deleted successfully"
}
```

**Important Notes:**
- **Soft delete** - Stage is marked as inactive (isActive: false), not permanently deleted
- Cannot delete default system stages
- Cannot delete if any deals are currently in this stage
- Can only delete your own custom stages

**Error Response (400 Bad Request):**
```json
{
  "error": "Cannot delete stage \"Discovery Call\" because it has 5 active deals. Please move these deals to another stage first."
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Cannot delete default pipeline stages"
}
```

---

### 6. Reorder Pipeline Stages

**Endpoint:** `POST /pipelineStages/reorder`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "stageOrders": [
    { "id": "stage-uuid-1", "order": 1 },
    { "id": "stage-uuid-2", "order": 2 },
    { "id": "stage-uuid-6", "order": 3 },
    { "id": "stage-uuid-3", "order": 4 }
  ]
}
```

**Parameters:**
- `stageOrders` (Array, **required**): Array of objects with `id` and `order` fields

**Response (200 OK):**
```json
{
  "message": "Pipeline stages reordered successfully"
}
```

**Note:** Can only reorder your own custom stages, not default system stages.

---

### 7. Initialize Default Stages

**Endpoint:** `POST /pipelineStages/initialize-defaults`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Default pipeline stages are available for use",
  "stages": [
    {
      "id": "default-stage-1",
      "name": "Lead",
      "slug": "lead",
      "...": "..."
    }
  ]
}
```

**Note:** This endpoint is mainly informational. Default stages are automatically available to all users.

---

## Email APIs

### 1. Send Email to Lead

**Endpoint:** `POST /emails/lead/:leadId`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "Follow-up on your inquiry",
  "text": "Hi, thank you for your interest in our product...",
  "html": "<p>Hi, thank you for your interest in our product...</p>",
  "cc": ["manager@company.com"],
  "bcc": ["records@company.com"],
  "attachments": [
    {
      "filename": "brochure.pdf",
      "path": "/path/to/brochure.pdf"
    }
  ]
}
```

**Required Fields:**
- `subject` (String): Email subject
- `text` (String): Plain text version of email

**Optional Fields:**
- `html` (String): HTML version of email
- `cc` (Array of Strings): CC recipients
- `bcc` (Array of Strings): BCC recipients
- `attachments` (Array): File attachments

**Response (200 OK):**
```json
{
  "success": true,
  "emailLogId": "email-log-uuid",
  "messageId": "<message-id@gmail.com>",
  "message": "Email sent successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Lead not found"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Lead has no email address"
}
```

---

### 2. Send Email to Contact

**Endpoint:** `POST /emails/contact/:contactId`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (Same as lead email)
```json
{
  "subject": "Monthly newsletter",
  "text": "Dear valued customer...",
  "html": "<p>Dear valued customer...</p>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "emailLogId": "email-log-uuid",
  "messageId": "<message-id@gmail.com>",
  "message": "Email sent successfully"
}
```

---

### 3. Send Email for Deal

**Endpoint:** `POST /emails/deal/:dealId`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "to": "customer@company.com",
  "subject": "Proposal for Enterprise License",
  "text": "Please find attached our proposal...",
  "html": "<p>Please find attached our proposal...</p>",
  "attachments": [
    {
      "filename": "proposal.pdf",
      "path": "/path/to/proposal.pdf"
    }
  ]
}
```

**Required Fields:**
- `to` (String): Recipient email address
- `subject` (String): Email subject
- `text` (String): Plain text content

**Note:** Unlike lead/contact emails, deal emails require explicit `to` address since deals may not have a direct email.

**Response (200 OK):**
```json
{
  "success": true,
  "emailLogId": "email-log-uuid",
  "messageId": "<message-id@gmail.com>",
  "message": "Email sent successfully"
}
```

---

### 4. Send Manual Email

**Endpoint:** `POST /emails/send`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "to": "customer@example.com",
  "subject": "Custom email",
  "text": "Email content here...",
  "html": "<p>Email content here...</p>",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

**Required Fields:**
- `to` (String): Recipient email
- `subject` (String): Email subject
- `text` (String): Plain text content

**Response (200 OK):**
```json
{
  "success": true,
  "emailLogId": "email-log-uuid",
  "messageId": "<message-id@gmail.com>",
  "message": "Email sent successfully"
}
```

---

### 5. Get Email Logs

**Endpoint:** `GET /emails`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): sent | failed | pending
- `entityType` (optional): Lead | Contact | Deal | Manual
- `limit` (optional, default: 50): Number of results
- `offset` (optional, default: 0): Pagination offset

**Example Request:**
```
GET /emails?status=sent&entityType=Lead&limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "emails": [
    {
      "id": "email-log-uuid",
      "to": "customer@example.com",
      "from": "you@company.com",
      "subject": "Follow-up on your inquiry",
      "status": "sent",
      "entityType": "Lead",
      "entityId": "lead-uuid",
      "messageId": "<message-id@gmail.com>",
      "errorMessage": null,
      "sentAt": "2024-12-05T10:30:00Z",
      "createdAt": "2024-12-05T10:30:00Z",
      "userId": "user-uuid"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

---

### 6. Get Single Email Log

**Endpoint:** `GET /emails/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "email-log-uuid",
  "to": "customer@example.com",
  "from": "you@company.com",
  "subject": "Follow-up on your inquiry",
  "text": "Email text content...",
  "html": "<p>Email HTML content...</p>",
  "status": "sent",
  "entityType": "Lead",
  "entityId": "lead-uuid",
  "messageId": "<message-id@gmail.com>",
  "threadId": "<thread-id@gmail.com>",
  "cc": [],
  "bcc": [],
  "attachments": [],
  "errorMessage": null,
  "sentAt": "2024-12-05T10:30:00Z",
  "createdAt": "2024-12-05T10:30:00Z",
  "userId": "user-uuid"
}
```

---

### 7. Get Email Stats

**Endpoint:** `GET /emails/stats/summary`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "totalSent": 156,
  "totalFailed": 3,
  "sentToday": 12,
  "sentThisWeek": 45,
  "sentThisMonth": 156
}
```

---

### 8. Delete Email Log

**Endpoint:** `DELETE /emails/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Email deleted successfully"
}
```

**Note:** Only deletes the log record, not the actual sent email.

---

### 9. Check for Email Replies

**Endpoint:** `POST /emails/check-replies`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "repliesFound": 3,
  "message": "Checked for email replies"
}
```

**Note:** Checks Gmail inbox for replies to sent emails and updates email logs with reply information.

---

### 10. Get Email with Replies

**Endpoint:** `GET /emails/:id/replies`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "email": {
    "id": "email-log-uuid",
    "subject": "Follow-up on your inquiry",
    "...": "..."
  },
  "replies": [
    {
      "from": "customer@example.com",
      "subject": "Re: Follow-up on your inquiry",
      "body": "Thank you for reaching out...",
      "receivedAt": "2024-12-05T14:30:00Z"
    }
  ]
}
```

---

## Calendar Events APIs

### 1. Get All Calendar Events

**Endpoint:** `GET /calendar/events`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `start` (optional): Start date filter (ISO format)
- `end` (optional): End date filter (ISO format)
- `syncWithGoogle` (optional): true | false (Sync with Google Calendar)

**Example Request:**
```
GET /calendar/events?start=2024-12-01T00:00:00Z&end=2024-12-31T23:59:59Z&syncWithGoogle=true
```

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "event-uuid-1",
      "title": "Client Meeting - Tech Solutions",
      "description": "Discuss enterprise license requirements",
      "startTime": "2024-12-06T10:00:00Z",
      "endTime": "2024-12-06T11:00:00Z",
      "location": "Office Conference Room A",
      "attendees": ["rajesh@techsolutions.com", "john@company.com"],
      "googleEventId": "google-event-id-123",
      "isAllDay": false,
      "color": "blue",
      "reminders": {
        "useDefault": false,
        "overrides": [
          { "method": "email", "minutes": 1440 },
          { "method": "popup", "minutes": 30 }
        ]
      },
      "createdAt": "2024-12-05T10:30:00Z",
      "updatedAt": "2024-12-05T10:30:00Z",
      "userId": "user-uuid"
    }
  ]
}
```

---

### 2. Create Calendar Event

**Endpoint:** `POST /calendar/events`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Client Meeting - Tech Solutions",
  "description": "Discuss enterprise license requirements",
  "startTime": "2024-12-06T10:00:00Z",
  "endTime": "2024-12-06T11:00:00Z",
  "location": "Office Conference Room A",
  "attendees": ["rajesh@techsolutions.com", "john@company.com"],
  "isAllDay": false,
  "color": "blue",
  "reminders": {
    "useDefault": false,
    "overrides": [
      { "method": "email", "minutes": 1440 },
      { "method": "popup", "minutes": 30 }
    ]
  },
  "syncWithGoogle": true
}
```

**Required Fields:**
- `title` (String)
- `startTime` (DateTime)
- `endTime` (DateTime)

**Optional Fields:**
- `description` (String)
- `location` (String)
- `attendees` (Array of email strings)
- `isAllDay` (Boolean, default: false)
- `color` (String, default: "blue")
- `reminders` (Object)
- `syncWithGoogle` (Boolean): Whether to also create in Google Calendar

**Response (200 OK):**
```json
{
  "event": {
    "id": "event-uuid-1",
    "title": "Client Meeting - Tech Solutions",
    "description": "Discuss enterprise license requirements",
    "startTime": "2024-12-06T10:00:00Z",
    "endTime": "2024-12-06T11:00:00Z",
    "location": "Office Conference Room A",
    "attendees": ["rajesh@techsolutions.com", "john@company.com"],
    "googleEventId": "google-event-id-123",
    "isAllDay": false,
    "color": "blue",
    "reminders": {
      "useDefault": false,
      "overrides": [
        { "method": "email", "minutes": 1440 },
        { "method": "popup", "minutes": 30 }
      ]
    },
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "userId": "user-uuid"
  }
}
```

---

### 3. Update Calendar Event

**Endpoint:** `PUT /calendar/events/:eventId`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Client Meeting - Tech Solutions (Rescheduled)",
  "startTime": "2024-12-07T14:00:00Z",
  "endTime": "2024-12-07T15:00:00Z",
  "syncWithGoogle": true
}
```

**Response (200 OK):**
```json
{
  "event": {
    "id": "event-uuid-1",
    "title": "Client Meeting - Tech Solutions (Rescheduled)",
    "description": "Discuss enterprise license requirements",
    "startTime": "2024-12-07T14:00:00Z",
    "endTime": "2024-12-07T15:00:00Z",
    "location": "Office Conference Room A",
    "attendees": ["rajesh@techsolutions.com", "john@company.com"],
    "googleEventId": "google-event-id-123",
    "isAllDay": false,
    "color": "blue",
    "reminders": {
      "useDefault": false,
      "overrides": [
        { "method": "email", "minutes": 1440 },
        { "method": "popup", "minutes": 30 }
      ]
    },
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T16:30:00Z",
    "userId": "user-uuid"
  }
}
```

---

### 4. Delete Calendar Event

**Endpoint:** `DELETE /calendar/events/:eventId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

**Note:** If the event is synced with Google Calendar, it will also be deleted from Google Calendar.

---

### 5. Google Calendar Integration

#### Get Google Calendar Auth URL

**Endpoint:** `GET /calendar/auth/url`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Usage:** Redirect user to this URL to authorize Google Calendar access.

---

#### Handle Google Calendar OAuth Callback

**Endpoint:** `POST /calendar/auth/callback`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "4/0AY0e-g7...",
  "userId": "user-uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully"
}
```

---

#### Check Google Calendar Connection Status

**Endpoint:** `GET /calendar/auth/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "connected": true,
  "configured": true
}
```

---

#### Disconnect Google Calendar

**Endpoint:** `POST /calendar/auth/disconnect`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Google Calendar disconnected"
}
```

---

## WhatsApp APIs

### 1. Send WhatsApp Message

**Endpoint:** `POST /whatsapp/send`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Hello! Thank you for your interest in our products.",
  "phoneNumber": "+91 98765 43210",
  "contactId": "contact-uuid"
}
```

**Parameters:**
- `message` (String, **required**): The message text to send
- `phoneNumber` (String, optional): Phone number with country code (e.g., "+91 9876543210")
- `contactId` (String, optional): If provided, phone number will be taken from contact record

**Note:** Either `phoneNumber` or `contactId` must be provided. If `contactId` is provided, the system will use the contact's WhatsApp number or phone number.

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "wamid.HBgLMT....",
  "recipient": "Rajesh Kumar",
  "phone": "+91 98765 43210",
  "message": "Message sent successfully",
  "conversationId": "conversation-uuid"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Message is required"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Contact not found"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "error": "WhatsApp is not configured",
  "message": "Please configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in environment variables"
}
```

---

### 2. Send Template Message

**Endpoint:** `POST /whatsapp/send-template`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "templateName": "welcome_message",
  "phoneNumber": "+91 98765 43210",
  "contactId": "contact-uuid",
  "parameters": ["John", "December 5, 2024"]
}
```

**Parameters:**
- `templateName` (String, **required**): The name of the approved WhatsApp template
- `phoneNumber` (String, optional): Phone number with country code
- `contactId` (String, optional): Contact ID to get phone number from
- `parameters` (Array of Strings, optional): Parameters for template placeholders

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "wamid.HBgLMT....",
  "message": "Template message sent successfully"
}
```

**Note:** WhatsApp templates must be pre-approved by Meta. Templates are used for:
- Welcome messages
- Order confirmations
- Appointment reminders
- Transaction alerts

---

### 3. Get All Conversations

**Endpoint:** `GET /whatsapp/conversations`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` (optional): Search by contact name or phone number
- `limit` (optional): Number of conversations to return (default: 50)
- `offset` (optional): Offset for pagination (default: 0)

**Example Request:**
```
GET /whatsapp/conversations?search=rajesh&limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "id": "conversation-uuid",
      "contactName": "Rajesh Kumar",
      "contactPhone": "+91 98765 43210",
      "contactId": "contact-uuid",
      "lastMessage": "Thank you for the information",
      "lastMessageAt": "2024-12-05T14:30:00Z",
      "unreadCount": 3,
      "aiEnabled": true,
      "filePath": "conversations/user-uuid/+919876543210.json",
      "createdAt": "2024-12-01T10:00:00Z",
      "updatedAt": "2024-12-05T14:30:00Z",
      "messages": [
        {
          "id": "message-uuid",
          "message": "Thank you for the information",
          "sender": "contact",
          "senderName": "Rajesh Kumar",
          "status": "received",
          "messageType": "text",
          "isAiGenerated": false,
          "createdAt": "2024-12-05T14:30:00Z"
        }
      ]
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

### 4. Get Single Conversation with Messages

**Endpoint:** `GET /whatsapp/conversations/:conversationId`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Example Request:**
```
GET /whatsapp/conversations/conv-uuid-123?limit=50&offset=0
```

**Response (200 OK):**
```json
{
  "id": "conversation-uuid",
  "contactName": "Rajesh Kumar",
  "contactPhone": "+91 98765 43210",
  "contactId": "contact-uuid",
  "lastMessage": "Thank you for the information",
  "lastMessageAt": "2024-12-05T14:30:00Z",
  "unreadCount": 0,
  "aiEnabled": true,
  "filePath": "conversations/user-uuid/+919876543210.json",
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2024-12-05T14:30:00Z",
  "messages": [
    {
      "id": "message-uuid-1",
      "message": "Thank you for the information",
      "sender": "contact",
      "senderName": "Rajesh Kumar",
      "status": "received",
      "messageType": "text",
      "isAiGenerated": false,
      "metadata": {
        "whatsappMessageId": "wamid.HBg...",
        "timestamp": "1701783000"
      },
      "createdAt": "2024-12-05T14:30:00Z"
    },
    {
      "id": "message-uuid-2",
      "message": "You're welcome! Is there anything else I can help you with?",
      "sender": "ai",
      "senderName": "AI Assistant",
      "status": "sent",
      "messageType": "text",
      "isAiGenerated": true,
      "metadata": {
        "whatsappMessageId": "wamid.HBg...",
        "intent": "provide_support",
        "sentiment": "neutral"
      },
      "createdAt": "2024-12-05T14:31:00Z"
    }
  ]
}
```

**Note:** This endpoint automatically marks the conversation as read (unreadCount reset to 0).

---

### 5. Start New Conversation

**Endpoint:** `POST /whatsapp/conversations/start`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "contactPhone": "+91 98765 43210",
  "contactName": "Rajesh Kumar",
  "contactId": "contact-uuid"
}
```

**Parameters:**
- `contactPhone` (String, **required**): Phone number with country code
- `contactName` (String, optional): Display name for the contact
- `contactId` (String, optional): Link to existing contact record

**Response (200 OK):**
```json
{
  "id": "conversation-uuid",
  "contactName": "Rajesh Kumar",
  "contactPhone": "+91 98765 43210",
  "contactId": "contact-uuid",
  "lastMessage": null,
  "lastMessageAt": null,
  "unreadCount": 0,
  "aiEnabled": true,
  "filePath": "conversations/user-uuid/+919876543210.json",
  "createdAt": "2024-12-05T14:30:00Z",
  "updatedAt": "2024-12-05T14:30:00Z",
  "messages": []
}
```

**Note:** If a conversation already exists with this phone number, it returns the existing conversation.

---

### 6. Search Contacts for WhatsApp

**Endpoint:** `GET /whatsapp/search-contacts`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `query` (required): Search term (minimum 2 characters)

**Example Request:**
```
GET /whatsapp/search-contacts?query=rajesh
```

**Response (200 OK):**
```json
{
  "contacts": [
    {
      "id": "contact-uuid",
      "name": "Rajesh Kumar",
      "company": "Tech Solutions Pvt Ltd",
      "phone": "+91 98765 43210",
      "whatsapp": "+91 98765 43210",
      "email": "rajesh@techsolutions.com"
    },
    {
      "id": "contact-uuid-2",
      "name": "Rajesh Sharma",
      "company": "Digital India Corp",
      "phone": "+91 87654 32109",
      "whatsapp": "+91 87654 32109",
      "email": "rajesh.sharma@digitalindia.com"
    }
  ]
}
```

**Note:** Searches across contact name, company, phone, WhatsApp number, and email. Returns maximum 10 results.

---

### 7. Delete Conversation

**Endpoint:** `DELETE /whatsapp/conversations/:conversationId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Conversation deleted successfully"
}
```

**Note:** This permanently deletes the conversation and all associated messages from both the database and file storage.

---

### 8. Toggle AI Assistant for Conversation

**Endpoint:** `PATCH /whatsapp/conversations/:conversationId/ai-toggle`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "enabled": true
}
```

**Parameters:**
- `enabled` (Boolean, **required**): `true` to enable AI, `false` to disable

**Response (200 OK):**
```json
{
  "success": true,
  "message": "AI assistant enabled for this conversation",
  "aiEnabled": true
}
```

**Note:** When AI is enabled, incoming WhatsApp messages will automatically receive AI-generated responses.

---

### 9. Check WhatsApp Configuration Status

**Endpoint:** `GET /whatsapp/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "configured": true,
  "message": "WhatsApp is configured and ready to use"
}
```

**Response when not configured:**
```json
{
  "configured": false,
  "message": "WhatsApp is not configured. Please set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID"
}
```

---

### 10. WhatsApp Webhook (For Meta/Facebook)

#### Webhook Verification (GET)

**Endpoint:** `GET /whatsapp/webhook`

**Query Parameters:**
- `hub.mode`: "subscribe"
- `hub.verify_token`: Your verification token
- `hub.challenge`: Challenge string from Meta

**Response:** Returns the challenge string if verification token matches.

**Note:** This endpoint is called by Meta to verify your webhook URL. Set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your environment variables.

---

#### Receive Messages (POST)

**Endpoint:** `POST /whatsapp/webhook`

**Note:** This endpoint is called by Meta when:
- A new message is received
- A message status changes (sent → delivered → read)
- This is a public endpoint (no authentication required)

**Request Body Example:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Rajesh Kumar"
                },
                "wa_id": "919876543210"
              }
            ],
            "messages": [
              {
                "from": "919876543210",
                "id": "wamid.HBgLMT...",
                "timestamp": "1701783000",
                "type": "text",
                "text": {
                  "body": "Hi, I'm interested in your products"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response:** `200 OK` with "EVENT_RECEIVED"

**Webhook Processing:**
1. System receives incoming WhatsApp message
2. Finds or creates conversation in CRM
3. Saves message to database and file storage
4. If AI is enabled for conversation, generates AI response
5. Sends AI response back via WhatsApp API
6. Saves AI response to conversation

---

## WhatsApp Integration Setup

### Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Business API Credentials
WHATSAPP_TOKEN=your_whatsapp_business_api_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

# AI Features (Optional)
ENABLE_AI_FEATURE=true
OPENAI_API_KEY=your_openai_api_key
```

### Getting WhatsApp Credentials

1. **Create Meta Developer Account:**
   - Go to https://developers.facebook.com
   - Create a new app with WhatsApp Business API

2. **Get Phone Number ID:**
   - Navigate to WhatsApp → API Setup
   - Copy the "Phone number ID"

3. **Get Access Token:**
   - In API Setup, copy the temporary access token
   - For production, generate a permanent token

4. **Setup Webhook:**
   - Add webhook URL: `https://your-domain.com/api/whatsapp/webhook`
   - Set verify token (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
   - Subscribe to `messages` events

### Message Types Supported

- **Text Messages**: Plain text messages
- **Image**: Images with optional captions
- **Document**: PDF, Excel, Word files with optional captions
- **Audio**: Voice messages
- **Video**: Video files with optional captions
- **Location**: GPS coordinates

### Template Message Guidelines

WhatsApp requires pre-approved templates for:
- Messages sent outside 24-hour customer service window
- Proactive business-initiated conversations

**Template Categories:**
- **UTILITY**: Account updates, order updates, appointment reminders
- **MARKETING**: Promotional offers, newsletters (requires opt-in)
- **AUTHENTICATION**: OTP, verification codes

---

## WhatsApp AI Features

The system includes AI-powered WhatsApp assistant that can:

✅ **Automatically respond** to customer inquiries
✅ **Detect intent** (product inquiry, support request, lead generation)
✅ **Analyze sentiment** (positive, negative, neutral)
✅ **Execute actions** (create leads, schedule tasks, update contacts)
✅ **Provide context-aware** responses based on conversation history
✅ **Maintain conversation** context across multiple messages

### AI Actions

The AI assistant can automatically:
- **Create leads** from interested customers
- **Schedule follow-up tasks** based on conversation
- **Update contact information** when customers provide details
- **Answer FAQs** using company knowledge base
- **Escalate to human** when necessary

---

## AI Assistant APIs

### 1. AI Chat

**Endpoint:** `POST /ai/chat`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What are the top deals in my pipeline?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you today?"
    }
  ]
}
```

**Required Fields:**
- `message` (String): User's question or query

**Optional Fields:**
- `conversationHistory` (Array): Array of previous messages for context

**Response (200 OK):**
```json
{
  "success": true,
  "response": "Here are your top deals:\n\n1. **Enterprise Software License** - Tech Solutions Pvt Ltd\n   - Value: ₹5,00,000\n   - Stage: Negotiation\n   - Probability: 75%\n\n2. **Annual Subscription** - Digital India Corp\n   - Value: ₹3,50,000\n   - Stage: Proposal\n   - Probability: 60%",
  "data": [
    {
      "tool": "query_deals",
      "result": {
        "deals": [
          {
            "id": "deal-1",
            "title": "Enterprise Software License",
            "company": "Tech Solutions Pvt Ltd",
            "value": 500000,
            "stage": "negotiation",
            "probability": 75
          }
        ],
        "count": 2
      }
    }
  ],
  "sources": [
    {
      "title": "CRM User Guide",
      "content": "How to manage deals in pipeline...",
      "score": 0.85
    }
  ],
  "stats": {
    "tokensUsed": 1250,
    "processingTime": "2.3s"
  }
}
```

**Features:**
- Natural language queries about CRM data
- Context-aware responses using conversation history
- Automatic database queries (leads, contacts, deals, tasks, etc.)
- Document search integration via vector database
- Support for custom pipeline stages
- User data isolation (only queries logged-in user's data)

**Example Queries:**
- "What are my top deals?"
- "Show me all leads from last week"
- "How many tasks are overdue?"
- "What's my total revenue this month?"
- "Create a follow-up task for Tech Solutions"

**Error Response (400 Bad Request):**
```json
{
  "error": "Message is required"
}
```

---

### 2. Get AI System Status

**Endpoint:** `GET /ai/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "whatsapp": {
    "enabled": true,
    "model": "gpt-4o-mini",
    "temperature": 0.3
  },
  "portal": {
    "enabled": true,
    "model": "gpt-4o",
    "temperature": 0.7
  },
  "vectorDatabase": {
    "initialized": true,
    "documentCount": 45,
    "collectionName": "crm_docs"
  }
}
```

**Note:** Returns configuration and status of AI features including WhatsApp AI and Portal AI.

---

### 3. Search Vector Database

**Endpoint:** `POST /ai/search`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "how to create a new lead",
  "limit": 5,
  "minScore": 0.7
}
```

**Required Fields:**
- `query` (String): Search query

**Optional Fields:**
- `limit` (Number, default: 5): Maximum results to return
- `minScore` (Number, default: 0.7): Minimum similarity score (0-1)

**Response (200 OK):**
```json
{
  "success": true,
  "query": "how to create a new lead",
  "results": [
    {
      "id": "doc-1",
      "content": "To create a new lead, navigate to the Leads page and click the 'Add Lead' button...",
      "metadata": {
        "title": "CRM User Guide - Leads",
        "category": "documentation"
      },
      "score": 0.92
    },
    {
      "id": "doc-2",
      "content": "Leads can be created manually or imported from CSV files...",
      "metadata": {
        "title": "Lead Management",
        "category": "tutorial"
      },
      "score": 0.85
    }
  ],
  "count": 2
}
```

**Note:** Searches the vector database for relevant documentation using semantic similarity.

---

### 4. Ingest Documents

**Endpoint:** `POST /ai/ingest`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "documents": [
    {
      "content": "This is documentation about CRM features...",
      "metadata": {
        "title": "CRM Features",
        "category": "documentation",
        "author": "Admin"
      }
    },
    {
      "content": "How to use the dashboard...",
      "metadata": {
        "title": "Dashboard Guide",
        "category": "tutorial"
      }
    }
  ]
}
```

**Required Fields:**
- `documents` (Array): Array of document objects
  - `content` (String, **required**): Document text content
  - `metadata` (Object, optional): Additional document information

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully ingested 15 document chunks",
  "chunksAdded": 15
}
```

**Note:** Documents are automatically chunked and embedded for semantic search. Useful for adding company knowledge base, FAQs, or documentation to the AI system.

---

### 5. Get Vector DB Stats

**Endpoint:** `GET /ai/stats`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "initialized": true,
    "documentCount": 45,
    "collectionName": "crm_docs",
    "embeddingModel": "text-embedding-3-small"
  }
}
```

---

### 6. Clear Vector Database

**Endpoint:** `DELETE /ai/clear`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** ADMIN (TODO: Add permission check)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vector database cleared successfully"
}
```

**Warning:** This permanently deletes all documents from the vector database. Use with caution.

---

## Search APIs

### Global Search

**Endpoint:** `GET /search`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)

**Example Request:**
```
GET /search?q=tech
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "contact-uuid-1",
      "type": "contact",
      "title": "Rajesh Kumar",
      "subtitle": "Tech Solutions Pvt Ltd · CEO",
      "metadata": "rajesh@techsolutions.com"
    },
    {
      "id": "lead-uuid-1",
      "type": "lead",
      "title": "Jane Smith",
      "subtitle": "Tech Corp · new",
      "metadata": "₹50,000 · high priority"
    },
    {
      "id": "deal-uuid-1",
      "type": "deal",
      "title": "Enterprise Software License",
      "subtitle": "Tech Solutions Pvt Ltd · negotiation",
      "metadata": "₹5,00,000 · 75% probability"
    },
    {
      "id": "task-uuid-1",
      "type": "task",
      "title": "Follow up with Tech Solutions",
      "subtitle": "Discuss payment terms for enterprise license",
      "metadata": "todo · high priority · Due: 12/6/2024"
    },
    {
      "id": "invoice-uuid-1",
      "type": "invoice",
      "title": "INV-2024-001",
      "subtitle": "Tech Solutions Pvt Ltd · sent",
      "metadata": "₹1,18,000 · Due: 12/20/2024"
    },
    {
      "id": "event-uuid-1",
      "type": "event",
      "title": "Client Meeting - Tech Solutions",
      "subtitle": "Discuss enterprise license requirements",
      "metadata": "12/6/2024, 10:00:00 AM · Office Conference Room A"
    }
  ],
  "total": 6
}
```

**Searchable Entities:**
- **Contacts**: Name, company, email, phone, designation
- **Leads**: Name, company, email, phone
- **Deals**: Title, company, contact name
- **Tasks**: Title, description
- **Invoices**: Invoice number, customer name, customer email
- **Calendar Events**: Title, description, location

**Search Features:**
- Case-insensitive search
- Searches across multiple fields per entity
- Returns maximum 5 results per entity type
- Unified result format with type, title, subtitle, metadata
- User data isolation (only searches logged-in user's data)

**Response when query too short:**
```json
{
  "results": []
}
```

**Note:** Requires minimum 2 characters for search query.

---

## Teams & Departments APIs

### Departments

#### 1. Get All Departments

**Endpoint:** `GET /teams/departments`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `includeInactive` (optional, default: "false"): "true" | "false"

**Example Request:**
```
GET /teams/departments?includeInactive=false
```

**Response (200 OK):**
```json
{
  "departments": [
    {
      "id": "dept-uuid-1",
      "name": "Sales",
      "description": "Sales and business development team",
      "managerId": "user-uuid-manager",
      "isActive": true,
      "createdAt": "2024-12-01T00:00:00Z",
      "updatedAt": "2024-12-01T00:00:00Z",
      "users": [
        {
          "id": "user-uuid-1",
          "name": "John Doe",
          "email": "john@company.com",
          "role": "AGENT"
        }
      ],
      "teams": [
        {
          "id": "team-uuid-1",
          "name": "Enterprise Sales",
          "description": "Handles enterprise deals",
          "isActive": true,
          "users": [
            {
              "id": "user-uuid-1",
              "name": "John Doe"
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### 2. Create Department

**Endpoint:** `POST /teams/departments`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** MANAGER or higher

**Request Body:**
```json
{
  "name": "Marketing",
  "description": "Marketing and communications team",
  "managerId": "user-uuid-manager"
}
```

**Required Fields:**
- `name` (String): Department name

**Optional Fields:**
- `description` (String): Department description
- `managerId` (String): User ID of department manager

**Response (201 Created):**
```json
{
  "department": {
    "id": "dept-uuid-2",
    "name": "Marketing",
    "description": "Marketing and communications team",
    "managerId": "user-uuid-manager",
    "isActive": true,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "users": [],
    "teams": []
  }
}
```

---

#### 3. Update Department

**Endpoint:** `PUT /teams/departments/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** MANAGER or higher

**Request Body:** (Partial update supported)
```json
{
  "name": "Sales & Marketing",
  "description": "Combined sales and marketing department",
  "managerId": "user-uuid-new-manager",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "department": {
    "id": "dept-uuid-1",
    "name": "Sales & Marketing",
    "...": "..."
  }
}
```

---

#### 4. Delete Department

**Endpoint:** `DELETE /teams/departments/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** ADMIN only

**Response (200 OK):**
```json
{
  "message": "Department deleted successfully"
}
```

---

### Teams

#### 5. Get All Teams

**Endpoint:** `GET /teams`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `departmentId` (optional): Filter by department ID
- `includeInactive` (optional, default: "false"): "true" | "false"

**Example Request:**
```
GET /teams?departmentId=dept-uuid-1&includeInactive=false
```

**Response (200 OK):**
```json
{
  "teams": [
    {
      "id": "team-uuid-1",
      "name": "Enterprise Sales",
      "description": "Handles enterprise deals",
      "departmentId": "dept-uuid-1",
      "managerId": "user-uuid-manager",
      "isActive": true,
      "createdAt": "2024-12-01T00:00:00Z",
      "updatedAt": "2024-12-01T00:00:00Z",
      "department": {
        "id": "dept-uuid-1",
        "name": "Sales"
      },
      "users": [
        {
          "id": "user-uuid-1",
          "name": "John Doe",
          "email": "john@company.com",
          "role": "AGENT"
        }
      ]
    }
  ]
}
```

---

#### 6. Create Team

**Endpoint:** `POST /teams`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** MANAGER or higher

**Request Body:**
```json
{
  "name": "SMB Sales",
  "description": "Small and medium business sales team",
  "departmentId": "dept-uuid-1",
  "managerId": "user-uuid-manager"
}
```

**Required Fields:**
- `name` (String): Team name

**Optional Fields:**
- `description` (String): Team description
- `departmentId` (String): Parent department ID
- `managerId` (String): Team manager user ID

**Response (201 Created):**
```json
{
  "team": {
    "id": "team-uuid-2",
    "name": "SMB Sales",
    "description": "Small and medium business sales team",
    "departmentId": "dept-uuid-1",
    "managerId": "user-uuid-manager",
    "isActive": true,
    "createdAt": "2024-12-05T10:30:00Z",
    "updatedAt": "2024-12-05T10:30:00Z",
    "department": {
      "id": "dept-uuid-1",
      "name": "Sales"
    },
    "users": []
  }
}
```

---

#### 7. Update Team

**Endpoint:** `PUT /teams/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** MANAGER or higher

**Request Body:** (Partial update supported)
```json
{
  "name": "Enterprise & SMB Sales",
  "description": "Combined enterprise and SMB sales",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "team": {
    "id": "team-uuid-1",
    "name": "Enterprise & SMB Sales",
    "...": "..."
  }
}
```

---

#### 8. Delete Team

**Endpoint:** `DELETE /teams/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** ADMIN only

**Response (200 OK):**
```json
{
  "message": "Team deleted successfully"
}
```

---

### Team Member Management

#### 9. Assign User to Team

**Endpoint:** `POST /teams/:teamId/users/:userId`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** MANAGER or higher

**Response (200 OK):**
```json
{
  "user": {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "AGENT",
    "teamId": "team-uuid-1",
    "team": {
      "id": "team-uuid-1",
      "name": "Enterprise Sales"
    },
    "department": {
      "id": "dept-uuid-1",
      "name": "Sales"
    }
  }
}
```

---

#### 10. Remove User from Team

**Endpoint:** `DELETE /teams/:teamId/users/:userId`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** MANAGER or higher

**Response (200 OK):**
```json
{
  "user": {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "AGENT",
    "teamId": null,
    "team": null,
    "department": null
  }
}
```

**Note:** Sets user's teamId to null, removing them from the team.

---

#### 11. Get Team Members

**Endpoint:** `GET /teams/:id/users`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "user-uuid-1",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "AGENT",
      "createdAt": "2024-12-01T00:00:00Z"
    },
    {
      "id": "user-uuid-2",
      "name": "Jane Smith",
      "email": "jane@company.com",
      "role": "AGENT",
      "createdAt": "2024-12-02T00:00:00Z"
    }
  ]
}
```

**Note:** Returns only active users assigned to the team, ordered by name.

---

## Guide: Adding New Field to Leads Form

When you need to add a new field to the leads form, you need to update multiple files in a specific order. Let's walk through adding a new field called `industry` (String type) to the Lead model.

### Step 1: Update Database Schema

**File:** `backend/prisma/schema.prisma`

**Location:** Around line 145 in the `Lead` model

**Action:** Add your new field to the Lead model

```prisma
model Lead {
  id                String   @id @default(uuid())
  name              String
  company           String
  email             String
  phone             String
  whatsapp          String?
  source            String
  status            String
  priority          String
  estimatedValue    Float
  assignedTo        String
  notes             String   @default("")
  tags              String[]
  website           String?
  linkedIn          String?
  twitter           String?
  facebook          String?
  industry          String?  // 👈 NEW FIELD ADDED HERE
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastContactedAt   DateTime?
  nextFollowUpAt    DateTime?

  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, priority])
  @@index([assignedTo])
  @@index([userId])
}
```

**Notes:**
- Add `?` after the type if the field is optional
- Use appropriate Prisma types: `String`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`, `String[]` (array)
- Add `@default()` if you want a default value

---

### Step 2: Run Database Migration

**Terminal Command:**

```bash
cd backend
npx prisma migrate dev --name add_industry_to_lead
npx prisma generate
```

**What this does:**
- Creates a new migration file in `backend/prisma/migrations/`
- Updates the database schema
- Regenerates Prisma Client with the new field

---

### Step 3: Update TypeScript Type Definition

**File:** `src/types/lead.ts`

**Action:** Add the new field to the Lead interface

```typescript
export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  whatsapp?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  estimatedValue: number;
  assignedTo: string;
  notes: string;
  tags: string[];
  website?: string;
  linkedIn?: string;
  twitter?: string;
  facebook?: string;
  industry?: string;  // 👈 NEW FIELD ADDED HERE
  createdAt: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
}

// If you have predefined options, create an enum or type
export type LeadIndustry =
  | 'technology'
  | 'manufacturing'
  | 'retail'
  | 'services'
  | 'healthcare'
  | 'finance'
  | 'other';
```

**Notes:**
- Use `?` for optional fields
- Match the TypeScript type with Prisma type (String → string, Int → number, Boolean → boolean, DateTime → Date)
- Create enums or union types if the field has predefined options

---

### Step 4: Update Frontend Form Component

**File:** `src/components/leads/LeadDialog.tsx`

#### 4a. Add to Form State (around line 30)

```typescript
const [formData, setFormData] = useState({
  name: '',
  company: '',
  email: '',
  phone: '',
  whatsapp: '',
  source: 'web-form' as LeadSource,
  status: 'new' as LeadStatus,
  priority: 'medium' as LeadPriority,
  estimatedValue: 0,
  assignedTo: '',
  notes: '',
  website: '',
  linkedIn: '',
  twitter: '',
  facebook: '',
  tags: '',
  industry: '',  // 👈 NEW FIELD ADDED HERE
});
```

#### 4b. Update useEffect for Edit Mode (around line 50-90)

```typescript
useEffect(() => {
  if (lead) {
    setFormData({
      name: lead.name || '',
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      source: lead.source || 'web-form',
      status: lead.status || 'new',
      priority: lead.priority || 'medium',
      estimatedValue: lead.estimatedValue || 0,
      assignedTo: lead.assignedTo || '',
      notes: lead.notes || '',
      website: lead.website || '',
      linkedIn: lead.linkedIn || '',
      twitter: lead.twitter || '',
      facebook: lead.facebook || '',
      tags: lead.tags.join(', ') || '',
      industry: lead.industry || '',  // 👈 NEW FIELD ADDED HERE
    });
  } else {
    // Reset form for new lead
    setFormData({
      // ... all fields
      industry: '',  // 👈 ADD HERE TOO
    });
  }
}, [lead, open]);
```

#### 4c. Update handleSubmit (around line 95-120)

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const newLead: Lead = {
    id: lead?.id || `L${Date.now()}`,
    name: formData.name,
    company: formData.company,
    email: formData.email,
    phone: formData.phone,
    whatsapp: formData.whatsapp || undefined,
    source: formData.source,
    status: formData.status,
    priority: formData.priority,
    estimatedValue: Number(formData.estimatedValue),
    assignedTo: formData.assignedTo,
    notes: formData.notes,
    createdAt: lead?.createdAt || new Date(),
    lastContactedAt: lead?.lastContactedAt,
    nextFollowUpAt: lead?.nextFollowUpAt,
    tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
    website: formData.website || undefined,
    linkedIn: formData.linkedIn || undefined,
    twitter: formData.twitter || undefined,
    facebook: formData.facebook || undefined,
    industry: formData.industry || undefined,  // 👈 NEW FIELD ADDED HERE
  };

  onSave(newLead);
  onOpenChange(false);
};
```

#### 4d. Add Form Input Field (around line 180-260)

Add the form field UI in the appropriate section. For industry, add it in the "Lead Details" section:

```tsx
{/* Lead Details */}
<div className="space-y-4">
  <h3 className="font-semibold text-foreground">Lead Details</h3>
  <div className="grid grid-cols-2 gap-4">
    {/* Existing fields... */}

    {/* 👇 NEW FIELD ADDED HERE */}
    <div>
      <Label htmlFor="industry">Industry</Label>
      <Select
        value={formData.industry}
        onValueChange={(value) => setFormData({ ...formData, industry: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select industry" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="technology">Technology</SelectItem>
          <SelectItem value="manufacturing">Manufacturing</SelectItem>
          <SelectItem value="retail">Retail</SelectItem>
          <SelectItem value="services">Services</SelectItem>
          <SelectItem value="healthcare">Healthcare</SelectItem>
          <SelectItem value="finance">Finance</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</div>
```

**Field Type Options:**

For **Text Input:**
```tsx
<div>
  <Label htmlFor="industry">Industry</Label>
  <Input
    id="industry"
    value={formData.industry}
    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
    placeholder="Enter industry"
  />
</div>
```

For **Number Input:**
```tsx
<Input
  id="revenue"
  type="number"
  value={formData.revenue}
  onChange={(e) => setFormData({ ...formData, revenue: Number(e.target.value) })}
/>
```

For **Select Dropdown:**
```tsx
<Select
  value={formData.industry}
  onValueChange={(value) => setFormData({ ...formData, industry: value })}
>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

For **Textarea:**
```tsx
<Textarea
  id="description"
  value={formData.description}
  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
  rows={3}
/>
```

For **Date Picker:**
```tsx
<Input
  id="followUpDate"
  type="datetime-local"
  value={formData.followUpDate}
  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
/>
```

---

### Step 5: Update Backend API Route (Optional)

**File:** `backend/routes/leads.js`

The lead routes already use `...req.body` which automatically includes all fields, so **no changes are needed** unless you want to add specific validation.

**Optional Validation Example:**

```javascript
// POST create new lead
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Optional: Add validation for the new field
    if (req.body.industry && !['technology', 'manufacturing', 'retail', 'services', 'healthcare', 'finance', 'other'].includes(req.body.industry)) {
      return res.status(400).json({ error: 'Invalid industry value' });
    }

    const lead = await prisma.lead.create({
      data: {
        ...req.body,
        userId
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});
```

---

### Step 6: Update Display Components (Optional)

If you want to display the new field in the leads list or detail view:

**File:** `src/components/leads/LeadDetailDialog.tsx` or `src/components/leads/LeadCard.tsx`

Add display logic for the new field:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label className="text-muted-foreground">Company</Label>
    <p>{lead.company}</p>
  </div>
  {/* 👇 NEW FIELD DISPLAY */}
  <div>
    <Label className="text-muted-foreground">Industry</Label>
    <p>{lead.industry || 'Not specified'}</p>
  </div>
</div>
```

---

### Step 7: Update AI Database Tools (If using Portal AI)

**File:** `backend/services/ai/databaseTools.service.js`

If you want the AI to query or filter by the new field:

```javascript
async queryLeads(args) {
  try {
    const where = { userId: args.userId };

    // Add filter for new field
    if (args.industry) {
      where.industry = { contains: args.industry, mode: 'insensitive' };
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        company: true,
        industry: true,  // 👈 ADD TO SELECT
        // ... other fields
      },
      orderBy: args.sortBy ? { [args.sortBy]: args.sortOrder || 'desc' } : { createdAt: 'desc' },
      take: args.limit || 20,
    });

    return { leads, count: leads.length };
  } catch (error) {
    console.error('Error querying leads:', error);
    throw error;
  }
}
```

Update the function definition to include the new parameter:

```javascript
getTools() {
  return [
    {
      name: 'query_leads',
      description: 'Query and filter leads from the CRM database',
      parameters: {
        type: 'object',
        properties: {
          // ... existing parameters
          industry: {
            type: 'string',
            description: 'Filter by industry'
          }
        }
      }
    },
    // ... other tools
  ];
}
```

---

## Complete Checklist: Adding New Field to Leads

- [ ] **Step 1:** Update `backend/prisma/schema.prisma` - Add field to Lead model
- [ ] **Step 2:** Run migration: `npx prisma migrate dev --name add_field_name` and `npx prisma generate`
- [ ] **Step 3:** Update `src/types/lead.ts` - Add field to Lead interface
- [ ] **Step 4:** Update `src/components/leads/LeadDialog.tsx`:
  - [ ] 4a. Add to formData state
  - [ ] 4b. Add to useEffect (both if and else blocks)
  - [ ] 4c. Add to handleSubmit
  - [ ] 4d. Add form input UI
- [ ] **Step 5:** (Optional) Add validation in `backend/routes/leads.js`
- [ ] **Step 6:** (Optional) Update display components (LeadDetailDialog, LeadCard, etc.)
- [ ] **Step 7:** (Optional) Update `backend/services/ai/databaseTools.service.js` for AI queries
- [ ] **Step 8:** Test create, update, and display functionality

---

## Common Field Types Reference

| Database Type (Prisma) | TypeScript Type | Form Input Component |
|------------------------|-----------------|---------------------|
| `String` | `string` | `<Input />` |
| `String?` | `string \| undefined` | `<Input />` |
| `Int` | `number` | `<Input type="number" />` |
| `Float` | `number` | `<Input type="number" step="0.01" />` |
| `Boolean` | `boolean` | `<Switch />` or `<Checkbox />` |
| `DateTime` | `Date` | `<Input type="datetime-local" />` |
| `String[]` | `string[]` | `<Input />` (comma-separated) or Multi-select |
| `Json` | `any` | Custom component |

---

## Error Codes Reference

| Status Code | Meaning | Common Causes |
|------------|---------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing required fields, invalid data format |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions (RBAC) |
| 404 | Not Found | Resource doesn't exist or doesn't belong to user |
| 500 | Server Error | Database error, server crash |

---

## RBAC (Role-Based Access Control)

The system implements 4 roles with hierarchical permissions:

**Permission Hierarchy:**
```
ADMIN > MANAGER > AGENT > VIEWER
```

**Role Permissions:**

| Action | ADMIN | MANAGER | AGENT | VIEWER |
|--------|-------|---------|-------|--------|
| View All | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Update Own | ✅ | ✅ | ✅ | ❌ |
| Update All | ✅ | ✅ | ❌ | ❌ |
| Delete Own | ✅ | ✅ | ✅ | ❌ |
| Delete All | ✅ | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ❌ | ❌ |

---

## Testing the APIs

### Using cURL

**Login Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

**Create Lead Example:**
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Jane Smith",
    "company": "Tech Corp",
    "email": "jane@techcorp.com",
    "phone": "+91 98765 43210",
    "source": "web-form",
    "status": "new",
    "priority": "high",
    "estimatedValue": 50000,
    "assignedTo": "John Doe",
    "notes": "Interested in enterprise plan",
    "tags": ["enterprise", "hot-lead"]
  }'
```

**Get All Leads Example:**
```bash
curl -X GET "http://localhost:3000/api/leads?status=new" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Using Postman

1. **Create Environment:**
   - Variable: `BASE_URL` = `http://localhost:3000/api`
   - Variable: `TOKEN` = (set after login)

2. **Login Request:**
   - Method: POST
   - URL: `{{BASE_URL}}/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "your@email.com",
       "password": "your_password"
     }
     ```
   - After successful login, copy the token and set it in the environment variable

3. **Authenticated Requests:**
   - Add to Headers:
     ```
     Authorization: Bearer {{TOKEN}}
     ```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/bharat-crm/issues
- Email: support@example.com

---

**Last Updated:** December 5, 2024
**API Version:** 1.0.0
