import { MultilineCommentHoverProvider } from "langium/lsp";
import { AstNode, LangiumDocument, MaybePromise, CstUtils, GrammarAST, } from "langium";
import { Hover, type HoverParams } from "vscode-languageserver";
import { toolboxApi } from "./meta-solver-strategy-module.js";
import { ProblemType, SolverID, SolverSetting, ProblemArrayName, ProblemName } from "./generated/ast.js";
import { getProblemTypeBySolverId, getProblemTypeByProblemName } from "./utils/ast-utils.js";

async function resolveMaybePromise<T>(input: MaybePromise<T>): Promise<T> {
    switch (typeof input) {
        case 'object':
            // Check if the input is a promise
            if (input && 'then' in input) {
                return await input; // Await the promise
            }
            // If it's not a promise but an object, return it directly
            return input;
        case 'function': {
            // If the input is a function, invoke it (assumed to return T or Promise<T>)
            const result = input();
            if (result && 'then' in result) {
                return await result; // Await the result if it's a promise
            }
            return result;
        } // Directly return the result
        default:
            throw new Error(`Unsupported type: ${typeof input}`);
    }
}

export class MetaSolverStrategyHoverProvider extends MultilineCommentHoverProvider {
    public override async getHoverContent(document: LangiumDocument, params: HoverParams): Promise<Hover | undefined> {
        // Copied original implementation from AstNodeHoverProvider
        const rootNode = document.parseResult?.value?.$cstNode;
        if (rootNode) {
            const offset = document.textDocument.offsetAt(params.position);
            const cstNode = CstUtils.findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (cstNode && cstNode.offset + cstNode.length > offset) {
                // Custom block for handling AST node hover content
                const undeclaredAstNodeResult = await this.getUndeclaredAstNodeHoverContent(cstNode.astNode);
                if (undeclaredAstNodeResult) {
                    return undeclaredAstNodeResult;
                }

                const targetNodes = this.references.findDeclarations(cstNode);
                if (targetNodes.length > 0) {
                    return {
                        contents: {
                            value: await resolveMaybePromise(this.getAstNodeHoverContent(targetNodes[0])) ?? "",
                            kind: "markdown"
                        }
                    };
                }

                // Add support for documentation on keywords
                if (GrammarAST.isKeyword(cstNode.grammarSource)) {
                    return this.getKeywordHoverContent(cstNode.grammarSource);
                }
            }
        }
        return undefined;
    }

    protected async getUndeclaredAstNodeHoverContent(node: AstNode): Promise<MaybePromise<Hover | undefined>> {
        switch (node.$type) {
            case ProblemType.$type: {
                const problemType: ProblemType = node as ProblemType;
                const type = toolboxApi.getProblemType(problemType.problemType);
                if (type) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Problem Type: ${type.id}**\n\n
${type.description}`
                        }
                    };
                }
                break;
            }
            case SolverID.$type: {
                const solverId: SolverID = node as SolverID;
                const problemType = getProblemTypeBySolverId(toolboxApi, solverId);
                if (!problemType) break;

                const solvers = await toolboxApi.fetchSolvers(problemType.id);
                const solver = solvers.find(s => s.id === solverId.solverId);
                if (!solver) break;

                if (problemType) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Solver for ${problemType.id}**\n\n
${solver.description}`
                        }
                    }
                }

                break;
            }
            case SolverSetting.$type: {
                const solverSetting: SolverSetting = node as SolverSetting;
                const solverId = solverSetting.$container.solverId;
                if (!solverId) break;

                const problemType = getProblemTypeBySolverId(toolboxApi, solverId);
                if (!problemType) break;

                const solver = await toolboxApi.getSolver(problemType.id, solverId.solverId);
                if (!solver) break;

                const solverSettings = await toolboxApi.fetchSolverSettings(problemType.id, solver.id);
                const setting = solverSettings.find(s => s.name === solverSetting.settingName);
                if (setting) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Setting for solver ${solverId.solverId}**\n\n
${setting.description}`
                        }
                    };
                }
                break;
            }
        }
        return undefined;
    }

    protected override getAstNodeHoverContent(node: AstNode): MaybePromise<string | undefined> {
        switch (node.$type) {
            case ProblemArrayName.$type: {
                const problemArrayName: ProblemArrayName = node as ProblemArrayName;
                const problemTypeId = problemArrayName.$container.problemTypes?.problemType.problemType;
                const problemType = toolboxApi.getProblemType(problemTypeId);
                if (problemType) {
                    return `**Array of Instances of Problem Type: ${problemType.id}**\n\n
${problemType.description}`;
                }
                break;
            }
            case ProblemName.$type: {
                const problemName: ProblemName = node as ProblemName;
                const problemType = getProblemTypeByProblemName(toolboxApi, problemName);
                if (problemType) {
                    return `**Instance of Problem Type: ${problemType.id}**\n\n
${problemType.description}`;
                }
                break;
            }
        }
        return super.getAstNodeHoverContent(node);
    }
}
