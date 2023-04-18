import pino from 'pino';

const { LOG_LEVEL = process.env.NODE_ENV === 'test' ? 'error' : 'info' } =
  process.env;

export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
