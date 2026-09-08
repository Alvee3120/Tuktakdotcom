/** @type {import("eslint").Linter.Config} */
const config = {
  rules: {
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};

module.exports = config;
