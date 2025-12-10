# Bharat CRM - API Documentation

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Leads APIs](#leads-apis)
3. [Contacts APIs](#contacts-apis)
4. [Deals APIs](#deals-apis)
5. [Tasks APIs](#tasks-apis)
6. [Calendar Events APIs](#calendar-events-apis)
7. [WhatsApp APIs](#whatsapp-apis)
8. [Guide: Adding New Field to Leads Form](#guide-adding-new-field-to-leads-form)

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
