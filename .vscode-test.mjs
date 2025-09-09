import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'src/test/**/*.test.ts',
    workspaceFolder: '.',
    mocha: {
        ui: 'tdd',
        timeout: 30000,
        retries: 1
    },
    launchArgs: ['--disable-extensions', '--disable-gpu'],
    version: 'stable',
    extensionDevelopmentPath: process.cwd(),
    extensionTestsPath: './dist/test'
});
