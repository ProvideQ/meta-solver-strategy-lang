import { CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, NextFeature } from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import { ProblemAttributeInt, ProblemType, SolverID, } from "./generated/ast.js";
import { GrammarAST } from "langium";
import { problemTypes } from "../api/ToolboxAPI.ts";
import * as api from "../api/ToolboxAPI.ts";
import { getProblemType, getProblemTypeNode, getSolverIdNode } from "./utils/ast-utils.js";

export class MetaSolverStrategyCompletionsProvider extends DefaultCompletionProvider {
    protected override async completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): Promise<void> {
        if  (context.node === undefined) return;

        switch (next.type) {
            case ProblemType:
                var problemTypeNode = getProblemTypeNode(context.node);

                for (const problemType of problemTypes) {
                    acceptor(context, {
                        label: problemType.id,
                        textEdit: {
                            range: problemTypeNode!.$cstNode!.range,
                            newText: problemType.id,
                        },
                        kind: CompletionItemKind.EnumMember,
                    })
                }
                break;
            case SolverID:
                const problemType = getProblemType(context.node);
                if (problemType === undefined) return;

                const solvers = await api.fetchSolvers(problemType.id);
                for (const solver of solvers) {
                    const subRoutines = await api.fetchSubRoutines(problemType.id, solver.id);
                    const settings = await api.fetchSolverSettings(problemType.id, solver.id);

                    let snippetJumpIndex = 1;

                    let insertText = `${solver.id}()`;
                    if (settings.length > 0) {
                        insertText = `${solver.id}(\n${settings.map((setting) => `\t"${setting.name}" = "\${${snippetJumpIndex++}}"`).join(",\n")})`;
                        // TODO: support auto complete for select settings
                    }

                    if (subRoutines.length > 0) {
                        insertText = `${insertText}:
${subRoutines.map((subRoutine) => `\tsolve ${api.getProblemType(subRoutine.typeId)?.id} ${api.getProblemType(subRoutine.typeId)?.id.toLowerCase()}:\n\t\t\${${snippetJumpIndex++}}`).join("\n")}`;
                        // TODO: add setting if subroutines can have multiple problems or just one problem to solve
                    }

                    const solverId = getSolverIdNode(context.node);
                    const value : CompletionValueItem = {
                        label: solver.id,
                        kind: CompletionItemKind.Function,
                        documentation: solver.description,
                        insertTextFormat: 2,
                    };
                    if (solverId) {
                        value.textEdit = {
                            range: solverId?.$cstNode!.range ?? context.node!.$cstNode!.range,
                            newText: insertText,
                        };
                    } else {
                        value.insertText = insertText;
                    }

                    acceptor(context, value)
                }
                break;
            case ProblemAttributeInt:
                acceptor(context, {
                    label: "size",
                    kind: CompletionItemKind.Property,
                    textEdit: {
                        range: context.node!.$cstNode!.range,
                        newText: "size",
                    },
                })
                break
            default:
                await super.completionFor(context, next, acceptor);
                break
        }
    }

    protected override async completionForKeyword(context: CompletionContext, keyword: GrammarAST.Keyword, acceptor: CompletionAcceptor): Promise<void> {
        if (keyword.value === "if") {
            acceptor(context, {
                label: "if",
                insertTextFormat: 2,
                insertText: `if \${1:condition}:
\t\${2}
else:
\t\${3}`,
                kind: CompletionItemKind.EnumMember,
            })
        } else if (keyword.value === "foreach") {
            acceptor(context, {
                label: "foreach",
                insertTextFormat: 2,
                insertText: `foreach \${2:problem} in \${1:problems}:
\t\${3}`,
                kind: CompletionItemKind.EnumMember,
            })
        } else {
            await super.completionForKeyword(context, keyword, acceptor);
        }
    }
}
