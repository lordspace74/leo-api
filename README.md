# LeoVegas User API

A RESTful API for managing users with role-based access control, built with
**Node.js**, **TypeScript**, and **NestJS**, backed by **PostgreSQL** via
**TypeORM**. Responses follow the [JSON:API](https://jsonapi.org/) specification.

## Features

- Full user CRUD with JWT authentication
- Role-based authorization (`USER` / `ADMIN`)
- Request validation with `class-validator`
- JSON:API-compliant responses and error objects
- Layered architecture (controller → service → repository) following SOLID

## Authorization rules

| Action                              | USER            | ADMIN |
| ----------------------------------- | --------------- | ----- |
| View own details                    | ✅              | ✅    |
| View another user                   | ❌ `403`        | ✅    |
| Update own details                  | ✅              | ✅    |
| Update another user (incl. role)    | ❌ `403`        | ✅    |
| List all users                      | ❌ `403`        | ✅    |
| Delete a user                       | ❌ `403`        | ✅    |
| Delete **self**                     | ❌ `403`        | ❌ `403` |
| Change own role                     | ❌ `403`        | ✅    |

Requests to non-existent users return `404`; unauthenticated requests return `401`.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a database and a `.env` file (copy the example):

   ```bash
   cp .env.example .env
   ```

   | Variable        | Default     | Description                  |
   | --------------- | ----------- | ---------------------------- |
   | `PORT`          | `3000`      | HTTP port                    |
   | `DB_HOST`       | `localhost` | Postgres host                |
   | `DB_PORT`       | `5432`      | Postgres port                |
   | `DB_USERNAME`   | `postgres`  | Postgres user                |
   | `DB_PASSWORD`   | `postgres`  | Postgres password            |
   | `DB_DATABASE`   | `leo_api`   | Database name                |
   | `JWT_SECRET`    | —           | Secret used to sign JWTs     |
   | `JWT_EXPIRES_IN`| `1h`        | Access token lifetime        |

   > The schema is created automatically on boot via TypeORM `synchronize`
   > (development only). For production you would disable it and use migrations.

## Running

```bash
npm run start         # start the API
npm run start:dev     # start in watch mode
```

The API listens on `http://localhost:3000`.

## Seeding an admin

Registration only ever creates `USER` accounts by design, so the first admin
must be bootstrapped. The seed script is idempotent and reads its credentials
from the environment (defaults shown):

```bash
npm run seed:admin
# ADMIN_NAME=Admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password
```

Override the defaults as needed:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=supersecret npm run seed:admin
```

## Testing

```bash
npm test              # run unit tests
npm run test:cov      # run with coverage
```

## API reference

All endpoints accept and return `application/json` (JSON:API shaped).
Authenticated endpoints require an `Authorization: Bearer <token>` header.

### `POST /auth/register`

Creates a new `USER` account.

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"password"}'
```

```json
{
  "data": {
    "type": "users",
    "id": "…",
    "attributes": { "name": "Alice", "email": "alice@example.com", "role": "USER", "created_at": "…", "updated_at": "…" }
  }
}
```

### `POST /auth/login`

Returns the user plus a freshly minted access token in `meta`.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password"}'
```

```json
{
  "data": { "type": "users", "id": "…", "attributes": { … } },
  "meta": { "access_token": "eyJhbGci…" }
}
```

### `GET /users` — _ADMIN only_

Lists all users.

### `GET /users/:id`

Returns a single user. A `USER` may only read their own record; an `ADMIN` may read any.

### `PATCH /users/:id`

Updates a user. A `USER` may update only their own non-role fields; an `ADMIN`
may update any user including their `role`.

```bash
curl -X PATCH http://localhost:3000/users/<id> \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"name":"New Name"}'
```

### `DELETE /users/:id` — _ADMIN only_

Deletes a user. Responds `204 No Content`. No user (including an admin) may
delete themselves.

## Design notes

- **`access_token` is never persisted.** The JWT is stateless and verified by
  signature, so storing it on the user row would be redundant, limited to a
  single session, and a credential-at-rest risk. It is returned in the login
  response `meta` and otherwise lives only client-side.
- **Repository abstraction.** `UsersService` depends on an `IUserRepository`
  interface (injected by token), not on TypeORM directly — keeping the domain
  logic persistence-agnostic and the dependency direction inverted (DIP).
- **Serialization** runs through `class-transformer`, so `@Exclude`-marked
  fields such as `password` never reach the response.
- **Dependency overrides.** `multer` and `js-yaml` are pinned via npm
  `overrides` to patched versions to clear transitive security advisories
  without downgrading framework majors; `npm audit` reports 0 vulnerabilities.

## Project structure

```
src/
  auth/            Registration, login, JWT strategy
  users/           Entity, DTOs, service, controller, repository
  common/          Guards, decorators, interceptors, filters, serializer
  database/seeds/  Admin bootstrap script
```
