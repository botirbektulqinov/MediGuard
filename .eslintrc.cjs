module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    'next-env.d.ts',
    '*.config.js',
    '*.config.cjs',
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      files: ['apps/api/src/**/*.controller.ts'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      extends: ['next/core-web-vitals', 'prettier'],
      rules: {
        '@next/next/no-html-link-for-pages': 'off',
      },
    },
    {
      files: ['*.js', '*.cjs'],
      parserOptions: {
        project: null,
      },
    },
  ],
};
