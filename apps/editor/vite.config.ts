import { defineConfig } from 'vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vue from '@vitejs/plugin-vue';
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
    return {
        plugins: [vue()],
        build: {
            target: 'esnext',
            rollupOptions: {
                input: {
                    // The config file lives in apps/editor, so the entry is the local index.html
                    index: path.resolve(__dirname, './index.html')
                }
            }
        },
        resolve: {
            alias: {
                'langium-core': path.resolve(__dirname, '../../packages/langium-core/index.ts'),
                'toolbox-api': path.resolve(__dirname, '../../packages/toolbox-api/index.ts')
            },
            dedupe: ['vscode']
        },
        optimizeDeps: {
            esbuildOptions: {
                plugins: [
                    importMetaUrlPlugin
                ]
            }
        }
    };
});
