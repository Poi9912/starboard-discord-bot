module.exports = {
  verbose: false,
  collectCoverage: true,
  reporters: [
    'jest-silent-reporter'
  ],
  collectCoverageFrom: [
    './**/*.{js,ts}',
    '!./index.js',
    '!./**config.js',
    '!coverage/**'
  ],
  coverageReporters: ["text", "lcov","json","clover"],
};