# API Endpoints Documentation

## Base URL
```
http://localhost:8000
```

---

## Admin Endpoints
Base Path: `/admin`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/admin/register` | Register a new admin | No |
| POST | `/admin/login` | Admin login | No |
| POST | `/admin/logout` | Admin logout | Yes (Admin) |
| GET | `/admin/me` | Get current admin info | Yes (Admin) |
| GET | `/admin/users` | List all users | Yes (Admin) |
| PUT | `/admin/users/:id` | Update user details | Yes (Admin) |
| DELETE | `/admin/users/:id` | Delete a user | Yes (Admin) |

---

## Auth Endpoints
Base Path: `/auth`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | User login (userID only) | No |
| GET | `/auth/me` | Get current user info | Yes (User) |
| PUT | `/auth/account` | Update user account | Yes (User) |
| PATCH | `/auth/account` | Update user account | Yes (User) |

**Request Body (POST /auth/register):**
```json
{
  "userID": "jdoe123",
  "email": "jdoe@example.com",
  "name": "John Doe",
  "DoB": "2005-03-15T00:00:00.000Z",
  "gradeId": 1
}
```

**Request Body (POST /auth/login):**
```json
{
  "userID": "jdoe123"
}
```

**Request Body (PUT/PATCH /auth/account):**
```json
{
  "email": "newemail@example.com",
  "userID": "newuserid123",
  "name": "John Updated",
  "DoB": "2005-03-15T00:00:00.000Z",
  "gradeId": 2
}
```

---

## User Endpoints
Base Path: `/users`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/users` | Get all users | Yes (User) |
| GET | `/users/me` | Get current user info | Yes (User) |
| GET | `/users/:id` | Get user by ID | Yes (User) |

---

## Grade Endpoints
Base Path: `/grades`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/grades` | List all grades | No |
| GET | `/grades/:id` | Get grade by ID | No |
| GET | `/grades/:gradeId/subjects` | List grade-subjects for a grade | No |
| POST | `/grades` | Create a new grade | Yes (Admin) |
| PUT | `/grades/:id` | Update a grade | Yes (Admin) |
| DELETE | `/grades/:id` | Delete a grade | Yes (Admin) |

**Request Body (POST/PUT):**
```json
{
  "curriculumVersionId": 1,
  "name": "Standard III",
  "code": "STANDARD_III",
  "level": 3,
  "stage": "PRIMARY",
  "active": true
}
```

---

## Grade Subject Endpoints
Base Path: `/grade-subjects`

A grade-subject is the join entity linking a grade to a subject. These endpoints are read-only and intended for browsing the curriculum by grade/subject combination.

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/grade-subjects/:id` | Get a grade-subject by ID (with grade and subject details) | No |
| GET | `/grade-subjects/:id/topics` | List topics linked to a grade-subject | No |
| GET | `/grade-subjects/:id/levels` | List game levels for a grade-subject | No |

---

## Game Type Endpoints
Base Path: `/game-types`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/game-types` | List all game types | No |
| GET | `/game-types/:id` | Get game type by ID | No |
| POST | `/game-types` | Create a new game type | Yes (Admin) |
| PUT | `/game-types/:id` | Update a game type | Yes (Admin) |
| DELETE | `/game-types/:id` | Delete a game type | Yes (Admin) |

**Request Body (POST/PUT):**
```json
{
  "name": "Multiple Choice",
  "code": "MULTIPLE_CHOICE",
  "description": "Select the correct answer from options.",
  "active": true
}
```

---

## Subject Endpoints
Base Path: `/subjects`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/subjects` | List all subjects | No |
| GET | `/subjects/:id` | Get subject by ID | No |
| POST | `/subjects` | Create a new subject | Yes (Admin) |
| PUT | `/subjects/:id` | Update a subject | Yes (Admin) |
| DELETE | `/subjects/:id` | Delete a subject and its related content | Yes (Admin) |

**Request Body (POST):**
```json
{
  "name": "Mathematics",
  "code": "MATHEMATICS",
  "icon": "calculator",
  "description": "Math subject",
  "active": true
}
```

---

## Topic Endpoints
Base Path: `/topics`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/topics` | List all topics | No |
| GET | `/topics/:id` | Get topic by ID | No |
| GET | `/topics/:id/questions` | List questions for a topic | No |
| POST | `/topics` | Create a new topic | Yes (Admin) |
| PUT | `/topics/:id` | Update a topic | Yes (Admin) |
| DELETE | `/topics/:id` | Delete a topic | Yes (Admin) |

**Request Body (POST):**
```json
{
  "subjectId": 1,
  "name": "Multiplication",
  "code": "MULTIPLICATION",
  "description": "Learn multiplication tables",
  "active": true,
  "gradeSubjectIds": [1, 2]
}
```

---

## Game Level Endpoints
Base Path: `/levels`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/levels` | List all game levels | No |
| GET | `/levels/:id` | Get game level by ID | No |
| GET | `/levels/:id/questions` | List questions for a game level | No |
| POST | `/levels` | Create a new game level | Yes (Admin) |
| PUT | `/levels/:id` | Update a game level | Yes (Admin) |
| DELETE | `/levels/:id` | Delete a game level | Yes (Admin) |

**Request Body (POST):**
```json
{
  "gradeSubjectId": 1,
  "levelNumber": 1,
  "name": "Level 1",
  "description": "Easy multiplication",
  "difficulty": "EASY",
  "requiredPoints": 0,
  "timeLimit": 30,
  "active": true
}
```

---

## Question Endpoints
Base Path: `/questions`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/questions` | List all questions | No |
| GET | `/questions/:id` | Get question by ID | No |
| POST | `/questions` | Create a new question | Yes (Admin) |
| PUT | `/questions/:id` | Update a question | Yes (Admin) |
| DELETE | `/questions/:id` | Delete a question | Yes (Admin) |

**Request Body (POST):**
```json
{
  "gameLevelId": 1,
  "gameTypeId": 1,
  "text": "What is 5 + 3?",
  "image": null,
  "audio": null,
  "explanation": "Adding 5 and 3 gives 8.",
  "points": 10,
  "timeLimit": 30,
  "active": true,
  "options": [
    { "text": "6", "isCorrect": false, "order": 0 },
    { "text": "7", "isCorrect": false, "order": 1 },
    { "text": "8", "isCorrect": true, "order": 2 },
    { "text": "9", "isCorrect": false, "order": 3 }
  ],
  "trueFalseAnswer": null,
  "matchingPairs": [],
  "orderingItems": [],
  "acceptedAnswers": [],
  "media": [],
  "competencyIds": [],
  "themeIds": []
}
```

---

## Competency Endpoints
Base Path: `/competencies`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/competencies` | List all competencies | No |
| GET | `/competencies/:id` | Get competency by ID | No |
| POST | `/competencies` | Create a new competency | Yes (Admin) |
| PUT | `/competencies/:id` | Update a competency | Yes (Admin) |
| DELETE | `/competencies/:id` | Delete a competency | Yes (Admin) |

**Request Body (POST/PUT):**
```json
{
  "topicId": 1,
  "name": "Add single-digit numbers",
  "code": "ADD_SINGLE_DIGIT",
  "description": "Students can add numbers up to 9.",
  "active": true
}
```

---

## Cross-Cutting Theme Endpoints
Base Path: `/themes`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/themes` | List all cross-cutting themes | No |
| GET | `/themes/:id` | Get theme by ID | No |
| POST | `/themes` | Create a new theme | Yes (Admin) |
| PUT | `/themes/:id` | Update a theme | Yes (Admin) |
| DELETE | `/themes/:id` | Delete a theme | Yes (Admin) |

**Request Body (POST/PUT):**
```json
{
  "name": "Financial Education",
  "code": "FINANCIAL_EDUCATION",
  "description": "Understanding money and savings.",
  "active": true
}
```

---

## User Game Profile Endpoints
Base Path: `/profiles`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/profiles/me` | Get current user game profile | Yes (User) |
| PUT | `/profiles/me` | Update current user game profile | Yes (User) |
| PATCH | `/profiles/me` | Update current user game profile | Yes (User) |

**Request Body (PUT/PATCH /profiles/me):**
```json
{
  "xp": 150,
  "coins": 50,
  "stars": 12,
  "currentStreak": 3,
  "longestStreak": 7
}
```

---

## Question Attempt Endpoints
Base Path: `/attempts`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/attempts` | Get current user question attempts | Yes (User) |
| POST | `/attempts` | Record a new question attempt | Yes (User) |

**Request Body (POST /attempts):**
```json
{
  "questionId": 1,
  "isCorrect": true,
  "pointsEarned": 10,
  "coinsEarned": 2,
  "starsEarned": 1,
  "timeTaken": 15,
  "answerData": { "selectedOption": 2 }
}
```

---

## User Level Progress Endpoints
Base Path: `/progress`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/progress` | Get current user level progress | Yes (User) |
| POST | `/progress` | Record new level progress | Yes (User) |
| PUT | `/progress/:levelId` | Update level progress | Yes (User) |
| PATCH | `/progress/:levelId` | Update level progress | Yes (User) |

**Request Body (POST /progress):**
```json
{
  "gameLevelId": 1,
  "gradeId": 3,
  "completed": true,
  "score": 100,
  "stars": 3,
  "bestScore": 100,
  "attempts": 1,
  "completedAt": "2026-08-26T15:00:00.000Z"
}
```

---

## Response Format

All endpoints follow a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful.",
  "<resource>": { ... }
}
```

`<resource>` is route-specific (for example, `subject`, `subjects`, `question`, or `questions`).

**Error Response:**
```json
{
  "success": false,
  "message": "Error message describing what went wrong."
}
```

---

## Authentication

### Admin Authentication
Admin endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <admin_token>
```

### User Authentication
User endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <user_token>
```

Tokens are obtained through the `/admin/login` or `/auth/login` endpoints respectively.
