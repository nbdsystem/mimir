'use strict';

require('dotenv').config();

const {
  NODE_ENV,
  LOG_LEVEL = 'info',
  HOST = '0.0.0.0',
  PORT = '4000',
} = process.env;

module.exports = {
  NODE_ENV,
  LOG_LEVEL,
  HOST,
  PORT,
};
