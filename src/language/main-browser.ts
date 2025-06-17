import { EmptyFileSystem } from 'langium';
import { startLanguageServer } from 'langium/lsp';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser.js';
import { createMetaSolverStrategyServices } from './meta-solver-strategy-module.js';
import * as api from '../api/ToolboxAPI.js';

declare const self: DedicatedWorkerGlobalScope;

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

api.initialize();
const connection = createConnection(messageReader, messageWriter);

const { shared } = createMetaSolverStrategyServices({ connection, ...EmptyFileSystem });

startLanguageServer(shared);
