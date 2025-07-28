import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
    const config = {
        build: {
            target: 'esnext',
            rollupOptions: {
                input: {
                    index: path.resolve(__dirname, './apps/editor/index.html')
                }
            }
        },
        resolve: {
            alias: {
                'langium-core': path.resolve(__dirname, '../../packages/langium-core/src/index.ts'),
                'toolbox-api': path.resolve(__dirname, '../../packages/toolbox-api/src/index.ts')
            },
            dedupe: ['vscode']
        },
        optimizeDeps: {
            esbuildOptions: {
                plugins: [
                    importMetaUrlPlugin
                ]
            }
        },
        server: {
            port: 5173
        }
    };
    return config;
});
