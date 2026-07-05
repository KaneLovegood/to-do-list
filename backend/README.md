# Todo API

NestJS REST API backed by MongoDB and Cloudinary.

## Environment

Copy `.env.example` to `.env` and provide your MongoDB and Cloudinary values.

## Run

```bash
pnpm install
pnpm start:dev
```

The API is available at `http://localhost:3001/api` by default.

## Todo endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/todos` | List todos |
| `GET` | `/api/todos/:id` | Read a todo |
| `POST` | `/api/todos` | Create a todo |
| `PATCH` | `/api/todos/:id` | Update a todo |
| `DELETE` | `/api/todos/:id` | Delete a todo |

Create and update accept JSON. They also accept `multipart/form-data`; use the
field name `image` for an optional JPEG, PNG, WebP, or GIF up to 5 MB. Updating
with `removeImage=true` removes the existing image.

Example multipart create:

```bash
curl -X POST http://localhost:3001/api/todos \
  -F "title=Ship the API" \
  -F "description=Connect the frontend" \
  -F "startDate=2026-07-05" \
  -F "deadline=2026-07-10" \
  -F "image=@task.png"
```
