const esbuild = require('esbuild');

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  minify: process.env.NODE_ENV === 'production',
  outdir: 'dist',
  platform: 'node',
  sourcemap: process.env.NODE_ENV !== 'production',
  target: 'node16',
};

Promise.all([
  esbuild.build({
    ...baseConfig,
    entryPoints: ['src/extension.ts'],
  }),
])
.catch(() => process.exit(1));

