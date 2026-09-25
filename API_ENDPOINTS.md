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

## User Endpoints
Base Path: `/users`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/users/register` | Register a new user | No |
| POST | `/users/login` | User login (userID only) | No |
| GET | `/users` | Get all users (paginated) | No |
| GET | `/users/me` | Get current user info | Yes (User) |
| GET | `/users/:id` | Get user by ID | Yes (User) |
| PUT | `/users/account` | Update user account | Yes (User) |
| PATCH | `/users/account` | Update user account | Yes (User) |

**Request Body (POST /users/register):**
```json
{
  "userID": "jdoe123",
  "email": "jdoe@example.com",
  "DoB": "2005-03-15T00:00:00.000Z",
  "gradeId": 1
}
```

**Example: successful POST /users/register**
```bash
curl -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "userID": "demo_user_001",
    "email": "demo_user_001@example.com",
    "DoB": "2005-03-15T00:00:00.000Z",
    "gradeId": 1
  }'
```

**Example: invalid POST /users/register (wrong types)**
```bash
curl -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "userID": 123,
    "email": "not-an-email",
    "gradeId": "abc"
  }'
```

**Error response example:**
```json
{
  "message": "userID: Invalid input: expected string, received number"
}
```

**Example: missing required field**
```bash
curl -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com"
  }'
```

**Missing field error example:**
```json
{
  "message": "userID: Invalid input: expected string, received undefined"
}
```

**Request Body (POST /users/login):**
```json
{
  "userID": "jdoe123"
}
```

**Request Body (PUT/PATCH /users/account):**
```json
{
  "email": "newemail@example.com",
  "userID": "newuserid123",
  "DoB": "2005-03-15T00:00:00.000Z",
  "gradeId": 2,
  "playerId": 1,
  "playerSkinId": 3
}
```

**Example: GET /users (list all users)**
```bash
curl -X GET http://localhost:8000/users
```

**Query Parameters:**
- `page` (optional, number) - Page number (default: 1)
- `limit` (optional, number) - Items per page (default: 15)

**Example with pagination:**
```bash
curl -X GET "http://localhost:8000/users?page=2&limit=10"
```

**Example response (GET /users):**
```json
{
  "users": [
    {
      "id": "12",
      "userID": "jdoe123",
      "email": "jdoe@example.com",
      "emailStatus": false,
      "gradeId": 2,
      "grade": {
        "id": "2",
        "name": "Grade 3",
        "code": "G3"
      },
      "profilePic": "https://example.com/avatar.png",
      "playerId": 1,
      "playerSkinId": 3,
      "player": {
        "id": 1,
        "name": "fox",
        "url1": "https://example.com/players/fox-front.png",
        "url2": "https://example.com/players/fox-side.png",
        "description": "A fast fox mascot"
      },
      "playerSkin": {
        "id": 3,
        "playerId": 1,
        "name": "neon",
        "url1": "https://example.com/skins/neon-1.png",
        "url2": "https://example.com/skins/neon-2.png",
        "description": "A bright neon skin"
      }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 15,
  "totalPages": 3
}
```

**Example: GET /users/:id (get user by ID)**
```bash
curl -X GET http://localhost:8000/users/12 \
  -H "Authorization: Bearer <user_token>"
```

**Example response (GET /users/:id):**
```json
{
  "user": {
    "id": "12",
    "userID": "jdoe123",
    "email": "jdoe@example.com",
    "emailStatus": false,
    "gradeId": 2,
    "grade": {
      "id": "2",
      "name": "Grade 3",
      "code": "G3"
    },
    "profilePic": "https://example.com/avatar.png",
    "playerId": 1,
    "playerSkinId": 3,
    "player": {
      "id": 1,
      "name": "fox",
      "url1": "https://example.com/players/fox-front.png",
      "url2": "https://example.com/players/fox-side.png",
      "description": "A fast fox mascot"
    },
    "playerSkin": {
      "id": 3,
      "playerId": 1,
      "name": "neon",
      "url1": "https://example.com/skins/neon-1.png",
      "url2": "https://example.com/skins/neon-2.png",
      "description": "A bright neon skin"
    }
  }
}
```

---

## Player and Player Skin Metadata

The user payload includes `playerId` and `playerSkinId`, and resolves them as nested objects with metadata. This applies to all user endpoints (GET /users, GET /users/:id, GET /users/me, PUT/PATCH /users/account).

**Player object:**
```json
{
  "id": 1,
  "name": "fox",
  "url1": "https://example.com/players/fox-front.png",
  "url2": "https://example.com/players/fox-side.png",
  "description": "A fast fox mascot"
}
```

**PlayerSkin object:**
```json
{
  "id": 3,
  "playerId": 1,
  "name": "neon",
  "url1": "https://example.com/skins/neon-1.png",
  "url2": "https://example.com/skins/neon-2.png",
  "description": "A bright neon skin"
}
```

---

## Players Endpoints
Base Path: `/players`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/players` | List all players | No |
| GET | `/players/:id` | Get player by ID | No |
| POST | `/players` | Create a player (multipart/form-data) | No |
| PUT | `/players/:id` | Update a player (multipart/form-data) | No |
| DELETE | `/players/:id` | Delete a player (removes DB record and local files) | Yes (Admin) |

POST/PUT form fields:
- `name` (string, required)
- `description` (string, optional)
- `image1` (file, optional) — stored at `storage/app/public/players/`, persisted URL saved as `/players/<filename>`
- `image2` (file, optional) — stored at `storage/app/public/players/`, persisted URL saved as `/players/<filename>`
- alternatively `url1`, `url2` (string) may be provided instead of files

Example (create with one image):
```
curl -X POST http://localhost:8000/players \
  -F "name=Example Player" \
  -F "description=Created by curl" \
  -F "image1=@/path/to/player.png"
```

Example response:
```json
{
  "success": true,
  "message": "Player created successfully.",
  "player": {
    "id": "1",
    "name": "Example Player",
    "description": "Created by curl",
    "url1": "/players/<filename>.png",
    "url2": null
  }
}
```

Uploaded player images are served statically at `/players/<filename>`.

Delete behavior:
- `DELETE /players/:id` requires an admin JWT in `Authorization: Bearer <token>`.
- When a player with local `url1`/`url2` pointing under `/players/` is deleted, the server removes the files from `storage/app/public/players` and deletes the DB record.

Example (delete):
```
curl -X DELETE http://localhost:8000/players/3 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Player Skin Endpoints
Base Path: `/player-skins`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/player-skins` | List all player skins | No |
| GET | `/player-skins/:id` | Get skin by ID | No |
| POST | `/player-skins` | Create a skin (multipart/form-data) | No |
| PUT | `/player-skins/:id` | Update a skin (multipart/form-data) | No |
| DELETE | `/player-skins/:id` | Delete a skin (removes DB record and local files) | Yes (Admin) |

POST/PUT form fields:
- `playerId` (number, optional) — associates skin to a player
- `name` (string, required)
- `description` (string, optional)
- `image1` (file, optional) — stored at `storage/app/public/skins/`, persisted URL saved as `/skins/<filename>`
- `image2` (file, optional) — stored at `storage/app/public/skins/`, persisted URL saved as `/skins/<filename>`
- alternatively `url1`, `url2` (string) may be provided instead of files

Example (create skin with image):
```
curl -X POST http://localhost:8000/player-skins \
  -F "playerId=1" \
  -F "name=Neon" \
  -F "image1=@/path/to/skin.png"
```

Example response:
```json
{
  "success": true,
  "message": "Skin created successfully.",
  "skin": {
    "id": "1",
    "playerId": 1,
    "name": "Neon",
    "description": null,
    "url1": "/skins/<filename>.png",
    "url2": null
  }
}
```

Uploaded skin images are served statically at `/skins/<filename>`.

Delete behavior:
- `DELETE /player-skins/:id` requires an admin JWT in `Authorization: Bearer <token>`.
- When a skin with local `url1`/`url2` pointing under `/skins/` is deleted, the server removes the files from `storage/app/public/skins` and deletes the DB record.

Example (delete):
```
curl -X DELETE http://localhost:8000/player-skins/2 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```


**Public user data (GET /users and GET /users/:id):**
```json
{
  "id": "12",
  "userID": "jdoe123",
  "email": "jdoe@example.com",
  "emailStatus": false,
  "gradeId": 2,
  "grade": {
    "id": "2",
    "name": "Grade 3",
    "code": "G3"
  },
  "profilePic": "https://example.com/avatar.png",
  "playerId": 1,
  "playerSkinId": 3,
  "player": {
    "id": 1,
    "name": "fox",
    "url1": "https://example.com/players/fox-front.png",
    "url2": "https://example.com/players/fox-side.png",
    "description": "A fast fox mascot"
  },
  "playerSkin": {
    "id": 3,
    "playerId": 1,
    "name": "neon",
    "url1": "https://example.com/skins/neon-1.png",
    "url2": "https://example.com/skins/neon-2.png",
    "description": "A bright neon skin"
  }
}
```

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

## Image Category Endpoints
Base Path: `/image-categories`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/image-categories` | List all image categories | No |
| GET | `/image-categories/:id` | Get image category by ID | No |
| POST | `/image-categories` | Create a new image category | Yes (Admin) |
| PUT | `/image-categories/:id` | Update an image category | Yes (Admin) |
| DELETE | `/image-categories/:id` | Delete an image category | Yes (Admin) |

**Request Body (POST):**
```json
{
  "name": "fruits"
}
```

---

## Image Endpoints
Base Path: `/images`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/images` | List all images (optionally filtered by `?categoryId=`) | No |
| GET | `/images/:id` | Get image by ID | No |
| POST | `/images` | Create a new image | Yes (Admin) |
| PUT | `/images/:id` | Update an image | Yes (Admin) |
| DELETE | `/images/:id` | Delete an image | Yes (Admin) |

**Request Body (POST):**
The create endpoint accepts `multipart/form-data` and stores the uploaded file under `storage/app/public/images/`, persisting the served URL in the database.

Form fields:
- `image` (file, required unless `url` is supplied) — the image file (PNG/JPG/GIF/etc., max 5 MB)
- `imageCategoryId` (number, required)
- `name` (string, required)
- `url` (string, optional) — fallback when no file is uploaded; an `image` file or a `url` must be provided

Example (file upload):
```
POST /images
Content-Type: multipart/form-data

image=@apple.png
imageCategoryId=1
name=apple
```

Example response:
```json
{
  "success": true,
  "message": "Image created successfully.",
  "image": {
    "id": "4",
    "imageCategoryId": 1,
    "name": "apple",
    "url": "/images/1788007259066-92796360.png"
  }
}
```

Uploaded images are served statically at the path returned in `url` (e.g. `GET /images/<filename>`).

---

## Audio Category Endpoints
Base Path: `/audio-categories`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/audio-categories` | List all audio categories | No |
| GET | `/audio-categories/:id` | Get audio category by ID | No |
| POST | `/audio-categories` | Create a new audio category | Yes (Admin) |
| PUT | `/audio-categories/:id` | Update an audio category | Yes (Admin) |
| DELETE | `/audio-categories/:id` | Delete an audio category | Yes (Admin) |

**Request Body (POST):**
Questions reference previously uploaded assets through `media`; they do not upload image or audio files. A media URL may be an existing `/images/<filename>` or `/audios/<filename>` path.

```json
{
  "name": "pronunciation"
}
```

---

## Audio Endpoints
Base Path: `/audios`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/audios` | List all audios (optionally filtered by `?categoryId=`) | No |
| GET | `/audios/:id` | Get audio by ID | No |
| POST | `/audios` | Create a new audio | Yes (Admin) |
| PUT | `/audios/:id` | Update an audio | Yes (Admin) |
| DELETE | `/audios/:id` | Delete an audio | Yes (Admin) |

**Request Body (POST):**
The create endpoint accepts `multipart/form-data` and stores the uploaded file under `storage/app/public/audios/`, persisting the served URL in the database.

Form fields:
- `audio` (file, required unless `url` is supplied) — the audio file (MP3/WAV/OGG/etc., max 10 MB)
- `audioCategoryId` (number, required)
- `name` (string, required)
- `url` (string, optional) — fallback when no file is uploaded; an `audio` file or a `url` must be provided

Example (file upload):
```
POST /audios
Content-Type: multipart/form-data

audio=@apple_pronunciation.mp3
audioCategoryId=1
name=apple_pronunciation
```

Example response:
```json
{
  "success": true,
  "message": "Audio created successfully.",
  "audio": {
    "id": "4",
    "audioCategoryId": 1,
    "name": "apple_pronunciation",
    "url": "/audios/1788007259066-92796360.mp3"
  }
}
```

Uploaded audios are served statically at the path returned in `url` (e.g. `GET /audios/<filename>`).

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
Questions reference previously uploaded assets through `media`; they do not upload image or audio files. A media URL may be an existing `/images/<filename>` or `/audios/<filename>` path.

```json
{
  "gameLevelId": 1,
  "topicId": 1,
  "gameTypeId": 1,
  "text": "What is 5 + 3?",
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

**Inline image placeholders in question text:**

The `text` field may include inline image references using the format `image(n)`, where `n` maps to the ordered media/image list. This allows prompts like:

- `image(3) + image(2) =`
- `what is this image(1)`
- `this is image(1) is red`

When a placeholder is used, the matching image must exist in the question's `media` list. Only media entries with `type: "IMAGE"` are counted, ordered by their `order` field. If it does not, the API responds with:

```json
{
  "success": false,
  "message": "image url is required"
}
```

**Example question with inline image placeholders:**
```json
{
  "gameLevelId": 1,
  "gameTypeId": 1,
  "text": "image(3) + image(2) =",
  "media": [
    { "type": "IMAGE", "url": "/images/apple.png", "order": 0 },
    { "type": "IMAGE", "url": "/images/apple2.png", "order": 1 },
    { "type": "IMAGE", "url": "/images/apple3.png", "order": 2 }
  ],
  "acceptedAnswers": [
    { "answer": "5", "isCaseSensitive": false }
  ],
  "points": 10,
  "active": true
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

## Profiles Endpoints
Base Path: `/profiles`

Authentication: No (public endpoints)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/profiles` | List all public game profiles (paginated) | No |
| GET | `/profiles/me` | Get a single profile. Accepts optional `?userId=` query | No |
| POST | `/profiles` | Create a profile (body must include `userId`) | No |
| PATCH | `/profiles/:id` | Update profile by `userId` | No |
| DELETE | `/profiles/:id` | Delete profile by `userId` | No |

Examples (no auth required):

- List all profiles
```
curl -s http://localhost:8000/profiles
```

**Query Parameters:**
- `page` (optional, number) - Page number (default: 1)
- `limit` (optional, number) - Items per page (default: 15)

**Example with pagination:**
```
curl -s "http://localhost:8000/profiles?page=2&limit=10"
```

Example response (200):
```json
{
  "success": true,
  "profiles": [
    { "userId": "1", "key": "profile-key-1", "xp": 150, "coins": 50, "stars": 12, "currentStreak": 3, "longestStreak": 7 },
    { "userId": "2", "key": "profile-key-2", "xp": 0, "coins": 0, "stars": 0, "currentStreak": 0, "longestStreak": 0 }
  ],
  "total": 25,
  "page": 1,
  "limit": 15,
  "totalPages": 2
}
```

- Get a profile (by query)
```
curl -s "http://localhost:8000/profiles/me?userId=1"
```
Example response (200):
```json
{
  "success": true,
  "profile": { "userId": "1", "key": "profile-key-1", "xp": 150, "coins": 50, "stars": 12, "currentStreak": 3, "longestStreak": 7 }
}
```

- Create a profile
```
curl -s -X POST http://localhost:8000/profiles \
  -H "Content-Type: application/json" \
  -d '{"userId":"2000","xp":10,"coins":5,"stars":1}'
```
Example response (201):
```json
{
  "success": true,
  "message": "Profile created.",
  "profile": { "userId": "2000", "key": "profile-key-2000", "xp": 10, "coins": 5, "stars": 1, "currentStreak": 0, "longestStreak": 0 }
}
```

- Update a profile
```
curl -s -X PATCH http://localhost:8000/profiles/1 \
  -H "Content-Type: application/json" \
  -d '{"xp":12345}'
```
Example response (200):
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "profile": { "userId": "1", "key": "profile-key-1", "xp": 12345, "coins": 50, "stars": 12, "currentStreak": 3, "longestStreak": 7 }
}
```

- Delete a profile
```
curl -s -X DELETE http://localhost:8000/profiles/3
```
Example response (200):
```json
{
  "success": true,
  "message": "Profile deleted."
}
```

---

## Question Attempt Endpoints
Base Path: `/attempts`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/attempts` | Get current user question attempts | Yes (User) |
| POST | `/attempts` | Record a new question attempt | Yes (User) |

**GET query parameters:**
- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Results per page (default: `15`, maximum: `100`)

Example:
```bash
curl "http://localhost:8000/attempts?page=1&limit=15" \
  -H "Authorization: Bearer <user_token>"
```

The GET response includes `attempts`, `total`, `page`, `limit`, and `totalPages`.

**Request Body (POST /attempts):**
```json
{
  "questionId": 1,
  "isCorrect": true,
  "pointsEarned": 10,
  "coinsEarned": 2,
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
  "px": 100,
  "stars": 3,
  "bestScore": 100,
  "attempts": 1,
  "completedAt": "2026-08-26T15:00:00.000Z"
}
```

---

## Leaderboard Endpoints
Base Path: `/leaderboards`

Global and grade leaderboard results use the `UserGameProfile` XP and longest-streak snapshots for overall rankings. Subject leaderboard results always use recorded question attempts scoped to the requested grade and subject, with `pointsEarned` treated as XP. Week and month results are also calculated from attempts. Periods use UTC boundaries: `week` starts Monday and `month` starts on the first day of the current month.

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/leaderboards` | Rank all users by XP or longest streak | No |
| GET | `/leaderboards/grades` | Return the best performer for every grade | No |
| GET | `/leaderboards/grades/:gradeId` | Return the best performer for one grade | No |
| GET | `/leaderboards/grades/:gradeId/subjects` | Return the best performer for every subject in a grade | No |
| GET | `/leaderboards/grades/:gradeId/:subjectId` | Return the best performer for one grade subject | No |

**Query parameters:**
- `period` (optional) - `week`, `month`, or `overall` (default: `overall`)
- `metric` (optional) - `xp` or `longestStreak` (default: `xp`)
- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Results per page (default: `15`, maximum: `100`)

**Examples:**
```bash
curl "http://localhost:8000/leaderboards?period=week&metric=xp"
curl "http://localhost:8000/leaderboards/grades?period=month&metric=longestStreak"
curl "http://localhost:8000/leaderboards/grades/1?period=overall&metric=xp"
curl "http://localhost:8000/leaderboards/grades/1/2?period=overall&metric=longestStreak"
curl "http://localhost:8000/leaderboards/grades/1/2?period=overall&metric=xp&page=1&limit=15"
curl "http://localhost:8000/leaderboards/grades/3/subjects?period=overall&metric=xp"
```

**Response example:**
```json
{
  "success": true,
  "period": "month",
  "metric": "xp",
  "entries": [
    {
      "rank": 1,
      "userId": "12",
      "userID": "jdoe123",
      "profilePic": null,
      "xp": 240,
      "longestStreak": 5
    }
  ],
  "total": 17,
  "page": 1,
  "limit": 15,
  "totalPages": 2
}
```

All leaderboard endpoints return ranked performers in their scope, not only the winner. Each response includes `total`, `page`, `limit`, and `totalPages`. Ranks remain based on the complete result set before pagination, so page two continues from the correct rank. Subject endpoints use only attempts whose question belongs to the requested grade and subject, and add a `subject` object to each result. Grade endpoints add a `grade` object to each result.

The singular grade and grade-subject endpoints return the selected result in an `entry` property and return `404` when no result exists for the requested scope.

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

Tokens are obtained through the `/admin/login` or `/users/login` endpoints respectively.
