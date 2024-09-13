export default {
    testEnvironment: 'node',
    transform: {
      '^.+\\.(js|jsx)$': 'babel-jest', // Use babel-jest to transform JS/JSX files
    },
    testMatch: ['**/__tests__/**/*.test.js'], // Your test files
    moduleFileExtensions: ['js', 'json'],
  };
  