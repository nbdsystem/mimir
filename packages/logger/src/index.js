import pino from 'pino';

const { LOG_LEVEL = 'info' } = process.env;
export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
