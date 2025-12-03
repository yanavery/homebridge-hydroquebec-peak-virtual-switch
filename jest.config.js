export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleNameMapper: {
    // Map relative .js imports to the same specifier without extension so Jest resolver
    // can pick the appropriate file (e.g. .ts) during tests. This avoids forcing
    // mapping node_modules internal .js files to .ts paths.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};