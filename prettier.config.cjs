'use strict';

const path = require('path');

module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  importOrder: ['^node:(.*)$', '<THIRD_PARTY_MODULES>', '^[./]'],
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  plugins: [
    require('@trivago/prettier-plugin-sort-imports'),
    require('prettier-plugin-tailwindcss'),
  ],
  tailwindConfig: path.resolve(__dirname, './www/tailwind.config.cjs'),
};
