# AGENTS.md

## Project Snapshot
- Runtime: Node.js ESM app (`"type": "module"`) with Express 5 and MongoDB/Mongoose.
- Entry point: `src/server.js` wires middleware, routes, celebrate error adapter, and global error handler.
- Main features implemented: cookie-based auth with password reset (`/auth` endpoints), avatar upload to Cloudinary (`/users` endpoints), and user-scoped notes CRUD + list filters (`/notes` endpoints).

## Architecture And Data Flow
- Request path is: `routes -> [authenticate] -> celebrate validation -> controller -> mongoose model -> JSON/cookie/stream response`.
- `src/routes/authRoutes.js`, `src/routes/notesRoutes.js`, and `src/routes/userRoutes.js` are all mounted in `server.js`.
- `src/controllers/authController.js` handles register/login/logout/refresh/requestResetEmail/resetPassword; session persistence and cookie writes live in `src/services/auth.js`.
  - Password reset: `requestResetEmail` generates JWT token (15min), renders HTML from `src/templates/reset-password-email.html` via handlebars, sends via `src/utils/sendEmail.js` (nodemailer/Brevo SMTP).
  - `resetPassword` verifies token, hashes and updates password, clears all user sessions.
- `src/controllers/userController.js` handles avatar upload: `PATCH /users/me/avatar` with `authenticate` → `multer.single('avatar')` → `updateUserAvatar`.
  - Uploads via `saveFileToCloudinary()` which streams buffer to `cloudinary.uploader.upload_stream()`, stores `secure_url` in User.avatar.
- `src/controllers/notesController.js` keeps business logic thin:
  - list endpoint composes `Note.find({ userId: req.user._id })` query with `tag` + `$text` search filters.
  - pagination uses `skip = (page - 1) * perPage`, returns `totalNotes`, `totalPages`.
- `src/models/note.js` has text index on `title`/`content`; `src/db/connectMongoDB.js` syncs indexes at boot.

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
  - `JWT_SECRET` (used for password reset and auth tokens)
  - `FRONTEND_DOMAIN` (base URL for password reset link in email)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (Brevo SMTP config for sending emails)
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Cloudinary config for avatar upload)

## Integration Points / In-Progress Areas
- Active auth integration points: `src/models/user.js`, `src/models/session.js`, `src/services/auth.js`, `src/middleware/authenticate.js`, `src/constants/time.js`.
- `src/constants/time.js` defines the access/refresh lifetimes used when creating sessions and cookies.
- Session refresh rotates credentials by deleting the old `Session` and creating a new one before resetting cookies.
- Password reset: `requestResetEmail` (POST /auth/request-reset-email) generates short-lived JWT, `resetPassword` (POST /auth/reset-password) consumes it. Template lives in `src/templates/reset-password-email.html`; email sending uses `src/utils/sendEmail.js` with nodemailer.
- Avatar upload: `PATCH /users/me/avatar` requires authentication, multer middleware filters by image mimetype (error: 'Only images allowed'), streams file buffer to Cloudinary via `src/utils/saveFileToCloudinary.js`, stores secure_url in User.avatar.
- If extending auth, keep validation in `validations/`, route handlers in `controllers/`, cookie/session helpers in `services/auth.js`, and persistence in `models/`.
- If extending password reset, edit `src/templates/reset-password-email.html` for HTML content, and ensure `FRONTEND_DOMAIN` and `JWT_SECRET` are set.
- If extending uploads, use `src/middleware/multer.js` for file filtering and `src/utils/saveFileToCloudinary.js` for cloud persistence.

