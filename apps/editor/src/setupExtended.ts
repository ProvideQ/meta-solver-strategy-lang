import { MonacoEditorLanguageClientWrapper, UserConfig } from 'monaco-editor-wrapper';
import { configureWorker, defineUserServices } from './setupCommon.js';

export const setupConfigExtended = (): UserConfig => {
    const extensionFilesOrContents = new Map();
    extensionFilesOrContents.set('/language-configuration.json', new URL('../language-configuration.json', import.meta.url));
    extensionFilesOrContents.set('/meta-solver-strategy-grammar.json', new URL('../syntaxes/meta-solver-strategy.tmLanguage.json', import.meta.url));

    return {
        wrapperConfig: {
            serviceConfig: defineUserServices(),
            editorAppConfig: {
                $type: 'extended',
                languageId: 'meta-solver-strategy',
                code: `solve VRP vrp:
  if vrp.dimension > 10:
    vrp.ClusterAndSolveVrpSolver():
      solve ClusterVRP clustervrp:
        clustervrp.TwoPhaseClusterer():
          solve TSP[] tsps:
            foreach tsp in tsps:
              tsp.QuboTspSolver():
                solve QUBO qubo:
                  qubo.DwaveQuboSolver(
                    "D-Wave Token" = "token",
                    "Annealing Method" = "sim")
  else:
    vrp.LkhVrpSolver()`,
                useDiffEditor: false,
                extensions: [{
                    config: {
                        name: 'meta-solver-strategy-web',
                        publisher: 'generator-langium',
                        version: '1.0.0',
                        engines: {
                            vscode: '*'
                        },
                        contributes: {
                            languages: [{
                                id: 'meta-solver-strategy',
                                extensions: [
                                    '.meta-solver-strategy'
                                ],
                                configuration: './language-configuration.json'
                            }],
                            grammars: [{
                                language: 'meta-solver-strategy',
                                scopeName: 'source.meta-solver-strategy',
                                path: './meta-solver-strategy-grammar.json'
                            }]
                        }
                    },
                    filesOrContents: extensionFilesOrContents,
                }],
                userConfiguration: {
                    json: JSON.stringify({
                        'editor.semanticHighlighting.enabled': true
                    })
                }
            }
        },
        languageClientConfig: configureWorker()
    };
};

export const executeExtended = async (htmlElement: HTMLElement) => {
    const userConfig = setupConfigExtended();
    const wrapper = new MonacoEditorLanguageClientWrapper();
    await wrapper.initAndStart(userConfig, htmlElement);
    return wrapper;
};
