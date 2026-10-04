# usermgmtserv-microservice

User account management microservice. It registers users and authenticates them, issuing JSON Web Tokens. Built with Express and MongoDB (Atlas).

## Configuration

Set these environment variables. Locally they can go in a `.env` file, which is gitignored and excluded from the Docker image. In production they are injected as GCP secrets.

| Variable     | Required | Description |
|--------------|----------|-------------|
| `MONGO_URI`  | yes      | MongoDB connection string. Users are stored in the `users` collection. |
| `JWT_SECRET` | yes      | Secret used to sign login tokens (HS256). |
| `PORT`       | no       | Port to listen on. Defaults to `5000`. Hosting platforms usually set this for you. |

If `MONGO_URI` or `JWT_SECRET` is missing, or the database can't be reached, the service exits on startup.

## Running locally

Requires Node.js 20.19+ (24 LTS recommended, see `.nvmrc`).

```bash
npm install
npm run dev     # auto-reload with nodemon
npm start       # plain node
```

## Docker

```bash
docker build -t usermgmtserv .
docker run --env-file .env -p 5000:5000 usermgmtserv
```

## API

All endpoints accept and return JSON (`Content-Type: application/json`).

### `POST /api/auth/register`

```json
{ "username": "alice", "password": "s3cret" }
```

| Status | Body |
|--------|------|
| 201 | `{ "message": "User registered successfully" }` |
| 400 | `{ "message": "User already exists" }` |
| 400 | `{ "message": "Username and password are required" }` |
| 500 | `{ "message": "Server error" }` |

Passwords are hashed with bcrypt before they are stored. New users get the role `user`.

### `POST /api/auth/login`

```json
{ "username": "alice", "password": "s3cret" }
```

| Status | Body |
|--------|------|
| 200 | `{ "token": "<jwt>" }` |
| 400 | `{ "message": "Invalid credentials" }` |
| 400 | `{ "message": "Username and password are required" }` |
| 500 | `{ "message": "Server error" }` |

The token is an HS256 JWT signed with `JWT_SECRET`. It has the payload `{ "id": "<user id>" }` and expires after 1 hour. Other services can verify it with the same secret.

Example:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"s3cret"}'
```

## Rate limiting

Limits apply per client IP:

| Scope | Limit | Response when exceeded |
|-------|-------|------------------------|
| All requests | 100 per 15 minutes | `429` "Too many requests from this IP, please try again after 15 minutes." |
| `POST /api/auth/login` | 5 per 10 minutes | `429` "Too many login attempts, please try again after 10 minutes." |

The global limit sends standard `RateLimit-*` headers. Counters are kept in memory, so they reset when the service restarts and each instance counts separately.
