'use strict';

module.exports = {
  moduleFileExtensions: ['tsx', 'ts', 'js', 'json', 'node'],
  modulePathIgnorePatterns: ['/.cache/', '/.next/'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.js?(x)',
    '<rootDir>/**/*.(spec|test).js?(x)',
    '<rootDir>/**/*-(spec|test).js?(x)',
  ],
  testPathIgnorePatterns: ['/.cache/', '/.next/', '/node_modules/'],
  transformIgnorePatterns: [
    '/.cache/',
    '/.next/',
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$',
  ],
  watchPathIgnorePatterns: ['/.cache/', '/.next/', '/node_modules/'],
};
