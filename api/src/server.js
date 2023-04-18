import { logger } from '@mimir/logger';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

export function setup() {
  const app = express();

  app.use((req, res, next) => {
    if (req.headers['x-request-id']) {
      req.id = req.headers['x-request-id'];
    } else {
      req.id = uuid();
    }

    res.setHeader('x-Request-Id', req.id);

    next();
  });
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }
  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json());
  app.disable('x-powered-by');

  app.get(
    '/',
    handler(async (req, res) => {
      res.send('Hello World');
    }),
  );

  app.use((_req, res, _next) => {
    res.status(404).send('Not found');
  });

  // https://expressjs.com/en/guide/error-handling.html
  app.use((error, _req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    res.status(500).send('Internal server error');
    logger.error(error);
  });

  return app;
}

function handler(handlerFn) {
  return (req, res, next) => {
    Promise.resolve(handlerFn(req, res, next)).catch(next);
  };
}
