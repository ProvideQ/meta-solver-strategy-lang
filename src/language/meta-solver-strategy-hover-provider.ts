import { MultilineCommentHoverProvider } from "langium/lsp";
import { AstNode, LangiumDocument, MaybePromise, CstUtils, GrammarAST, } from "langium";
import { Hover, type HoverParams } from "vscode-languageserver";
import { ProblemArrayName, ProblemName, ProblemType, SolverID } from "./generated/ast.js";
import { getProblemTypeByName } from "../api/ToolboxAPI.js";
import { getProblemType } from "./utils/ast-utils.js";
import * as api from "../api/ToolboxAPI.ts";
import { getSimpleSolverName } from "./utils/solver-utils.js";

export class MetaSolverStrategyHoverProvider extends MultilineCommentHoverProvider {
    protected override getKeywordHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        console.log("TEST HoverProvider keyword", node);
        return super.getKeywordHoverContent(node);
    }

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

                const targetNode = this.references.findDeclaration(cstNode);
                if (targetNode) {
                    return this.getAstNodeHoverContent(targetNode);
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
            case ProblemType: {
                const problemType: ProblemType = node as ProblemType;
                const type = getProblemTypeByName(problemType.problemType);
                if (type) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Problem Type: ${type.name}**\n\n
${type.description}`
                        }
                    };
                }
                break;
            }
            case SolverID: {
                const solverId: SolverID = node as SolverID;
                if (!solverId.$container.problemName?.ref) break;

                const problemType = getProblemType(solverId.$container.problemName.ref);
                if (!problemType) break;

                const solvers = await api.fetchSolvers(problemType.id);
                const solver = solvers.find(s => getSimpleSolverName(s) === solverId.solverId);
                if (!solver) break;

                if (problemType) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Solver for ${problemType.name}**\n\n
${problemType.description}`
                        }
                    }
                }

                break;
            }
        }
        return undefined;
    }

    protected override getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        console.log("TEST HoverProvider astNode", node);
        switch (node.$type) {
            case ProblemArrayName: {
                const problemArrayName: ProblemArrayName = node as ProblemArrayName;
                const problemTypeName = problemArrayName.$container.problemTypes?.problemType.problemType;
                const problemType = getProblemTypeByName(problemTypeName);
                if (problemType) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Array of Problem Type: ${problemType.name}**\n\n
${problemType.description}`
                        }
                    };
                }
                break;
            }
            case ProblemName: {
                const problemName: ProblemName = node as ProblemName;
                const problemType = getProblemType(problemName);
                if (problemType) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Instance of Problem Type: ${problemType.name}**\n\n
${problemType.description}`
                        }
                    };
                }
                break;
            }
        }
        return super.getAstNodeHoverContent(node);
    }
}
