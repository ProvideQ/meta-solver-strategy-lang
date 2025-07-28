import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { createMetaSolverStrategyServices } from 'langium-core/src/language/meta-solver-strategy-module.ts';
import { toolboxApi } from '../api.ts';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared } = createMetaSolverStrategyServices(toolboxApi, { connection, ...NodeFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);
