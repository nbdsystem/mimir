'use strict';

const path = require('node:path');

module.exports = {
  extends: ['plugin:@next/next/recommended'],
  rules: {
    '@next/next/no-html-link-for-pages': [
      'error',
      path.join(__dirname, 'src', 'pages'),
    ],
  },
};
