# AGENTS.md

## Project Snapshot
- Runtime: Node.js ESM app (`"type": "module"`) with Express 5 and MongoDB/Mongoose.
- Entry point: `src/server.js` wires middleware, routes, celebrate error adapter, and global error handler.
- Main features implemented: cookie-based auth (`/auth` endpoints) and user-scoped notes CRUD + list filters (`/notes` endpoints).

## Architecture And Data Flow
- Request path is: `routes -> authenticate (for /notes) -> celebrate validation -> controller -> mongoose model -> JSON/cookie response`.
- `src/routes/authRoutes.js` and `src/routes/notesRoutes.js` are both mounted directly in `server.js`.
- `src/controllers/authController.js` handles register/login/logout/refresh; session persistence and cookie writes live in `src/services/auth.js`.
- `src/controllers/notesController.js` keeps business logic thin and query-driven:
  - list endpoint composes a mutable `Note.find({ userId: req.user._id })` query and applies `tag` + `$text` search filters.
  - pagination uses `skip = (page - 1) * perPage` and returns metadata (`totalNotes`, `totalPages`).
- `src/models/note.js` defines a text index on `title` and `content`; `search` depends on this index.
- `src/db/connectMongoDB.js` calls `Note.syncIndexes()` after connection, so index updates happen at boot.

## Validation And Error Strategy
- Route validation uses celebrate/Joi schemas in `src/validations/notesValidation.js` and `src/validations/authValidation.js`.
- ObjectId parameters are validated with a custom Joi validator using `isValidObjectId`.
- `src/middleware/authenticate.js` reads `accessToken` from cookies, resolves the backing `Session`, checks expiry, and attaches `req.user`.
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
- Note ownership is enforced in controllers, e.g. `Note.findOne({ _id: noteId, userId: req.user._id })` and `Note.create({ ...req.body, userId: req.user._id })`.
- Auth is cookie-based rather than `Authorization`-header based: `setSessionCookies` writes `accessToken`, `refreshToken`, and `sessionId` as HTTP-only cookies.
- Login keeps one active session per user by deleting any existing `Session` before creating a new one.
- `src/models/user.js` removes `password` in `toJSON()`, so auth controllers can safely return user documents directly.

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
- Active auth integration points: `src/models/user.js`, `src/models/session.js`, `src/services/auth.js`, `src/middleware/authenticate.js`, `src/constants/time.js`.
- `src/constants/time.js` defines the access/refresh lifetimes used when creating sessions and cookies.
- Session refresh rotates credentials by deleting the old `Session` and creating a new one before resetting cookies.
- If extending auth, keep validation in `validations/`, route handlers in `controllers/`, cookie/session helpers in `services/auth.js`, and persistence in `models/`.

