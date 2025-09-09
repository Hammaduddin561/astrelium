import * as path from 'path';
import { glob } from 'glob';
import Mocha from 'mocha';

export async function run(): Promise<void> {
    try {
        // Create the test suite
        const mocha = new Mocha({
            ui: 'tdd',
            color: true,
            timeout: 10000
        });

        // Get the test root directory
        const testsRoot = path.resolve(__dirname, '.');

        // Find all test files
        const testFiles = await findTestFiles(testsRoot);

        // Add all test files to Mocha
        testFiles.forEach(file => {
            mocha.addFile(path.resolve(testsRoot, file));
        });

        // Run the tests
        return await runTests(mocha);
    } catch (error) {
        console.error('Test runner error:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}

function findTestFiles(testsRoot: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        glob('**/*.test.js', { cwd: testsRoot }, (error, matches) => {
            if (error) {
                reject(error);
            } else {
                resolve(matches);
            }
        });
    });
}

function runTests(mocha: Mocha): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            mocha.run((failures: number) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}