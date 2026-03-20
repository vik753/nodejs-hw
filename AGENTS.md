# AGENTS.md

## Project Snapshot
- Runtime: Node.js ESM app (`"type": "module"`) with Express 5 and MongoDB/Mongoose.
- Entry point: `src/server.js` wires middleware, routes, celebrate error adapter, and global error handler.
- Main feature implemented: notes CRUD + list filters (`/notes` endpoints).

## Architecture And Data Flow
- Request path is: `routes -> celebrate validation -> controller -> mongoose model -> JSON response`.
- `src/routes/notesRoutes.js` is the single API surface right now (all routes mounted directly in `server.js`).
- `src/controllers/notesController.js` keeps business logic thin and query-driven:
  - list endpoint composes a mutable `Note.find()` query and applies `tag` + `$text` search filters.
  - pagination uses `skip = (page - 1) * perPage` and returns metadata (`totalNotes`, `totalPages`).
- `src/models/note.js` defines a text index on `title` and `content`; `search` depends on this index.
- `src/db/connectMongoDB.js` calls `Note.syncIndexes()` after connection, so index updates happen at boot.

## Validation And Error Strategy
- Route validation uses celebrate/Joi schemas in `src/validations/notesValidation.js`.
- ObjectId parameters are validated with a custom Joi validator using `isValidObjectId`.
- Error pipeline order in `src/server.js` matters: `notFoundHandler -> errors() from celebrate -> errorHandler`.
- `src/middleware/errorHandler.js` maps:
  - `http-errors` status directly,
  - mongoose `CastError` to 404,
  - mongoose `ValidationError` to 400,
  - everything else to 500.
- Production responses hide stack traces (`NODE_ENV=production`).

## Conventions Specific To This Repo
- Controllers throw `createHttpError(404, 'Note not found')` instead of manual `res.status(...).send(...)` branches.
- Allowed note tags are centralized in `src/constants/tags.js` and reused in Joi + Mongoose enum.
- Logging uses `pino-http` pretty transport (`src/middleware/logger.js`) with compact request/response formatting.
- ESLint enforces semicolons and allows unused handler args (`args: 'none'`) for middleware signatures.

## Developer Workflows
- Install deps: `npm install`
- Dev server with reload: `npm run dev`
- Production-style run: `npm start`
- There is no real test suite yet (`npm test` intentionally exits with error).
- Required env vars discovered in code:
  - `MONGO_URL` (required by `connectMongoDB`)
  - `PORT` (optional, defaults to `3000`)
  - `NODE_ENV` (affects error output)

## Integration Points / In-Progress Areas
- Existing but not wired into routes yet: `src/models/user.js`, `src/models/session.js`, `src/services/auth.js`, `src/constants/time.js`.
- If adding auth, follow existing layering: schema validation in `validations/`, route handlers in `controllers/`, persistence in `models/`.

