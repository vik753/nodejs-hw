import { isHttpError } from 'http-errors';

const NODE_ENV = process.env.NODE_ENV;

export const errorHandler = (err, req, res, next) => {
  const isProd = NODE_ENV === 'production';
  !isProd && console.error(err.stack);

  let statusCode = 500;
  if (isHttpError(err)) {
    statusCode = err.status;
  } else if (err.name === 'CastError') {
    statusCode = 404;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  const errorJson = isProd
    ? { message: err.message || err.name }
    : { message: err.message || err.name, stack: err.stack };
  res.status(statusCode).json(errorJson);
};
