import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino-http';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV;

const app = express();
app.use(express.json());
app.use(cors());
app.use(
  pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat:
          '{req.method} {req.url} {res.statusCode} - {responseTime}ms',
        hideObject: true,
      },
    },
  }),
);

// Реалізований маршрут GET /notes
app.get('/notes', (req, res) => {
  res.status(200).json({ message: 'Retrieved all notes' });
});

// Реалізований маршрут GET /notes/:noteId
app.get('/notes/:noteId', (req, res) => {
  const { noteId } = req.params;
  res.status(200).json({ message: `Retrieved note with ID: ${noteId}` });
});

// Реалізований маршрут GET /test-error
app.get('/test-error', (req, res) => {
  throw new Error('Simulated server error');
});

// Реалізація not found handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Реалізація error handler
app.use((err, req, res, next) => {
  const isProd = NODE_ENV === 'production';
  !isProd && console.error(err.stack);
  const errorJson = isProd
    ? { message: err.message }
    : { message: err.message, stack: err.stack };
  res.status(500).json(errorJson);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
