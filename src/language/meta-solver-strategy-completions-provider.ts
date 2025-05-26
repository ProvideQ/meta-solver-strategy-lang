import { CompletionAcceptor, CompletionContext, DefaultCompletionProvider, NextFeature } from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import { ProblemAttributeInt, ProblemType, Solver, SolverID, } from "./generated/ast.js";
import { GrammarAST } from "langium";
import * as api from "../api/ToolboxAPI.ts";
import { getProblemType } from "./utils/ast-utils.js";
import { getSimpleSolverName } from "./utils/solver-utils.js";

export class MetaSolverStrategyCompletionsProvider extends DefaultCompletionProvider {
    protected override async completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): Promise<void> {
        console.log("TEST CompletionProvider", context, next, acceptor);
        switch (next.type) {
            case ProblemType:
                for (const problemType of api.problemTypes) {
                    acceptor(context, {
                        label: problemType.name,
                        kind: CompletionItemKind.EnumMember,
                    })
                }
                break;
            case SolverID:
                const solverId: Solver = context.node as Solver;
                if (solverId.problemName === undefined) return;

                const problemType = solverId.problemName.ref
                    ? getProblemType(solverId.problemName.ref)
                    : undefined;
                if (problemType === undefined) return;

                const solvers = await api.fetchSolvers(problemType.id);
                for (const solver of solvers) {
                    const id = getSimpleSolverName(solver);
                    const subRoutines = await api.fetchSubRoutines(problemType.id, solver.id);
                    const settings = await api.fetchSolverSettings(problemType.id, solver.id);

                    let snippetJumpIndex = 1;

                    let insertText = `${id}()`;
                    if (settings.length > 0) {
                        insertText = `${id}(\n${settings.map((setting) => `\t"${setting.name}" = "\${${snippetJumpIndex++}}"`).join(",\n")})`;
                        // TODO: support auto complete for select settings
                    }

                    if (subRoutines.length > 0) {
                        insertText = `${insertText}:
${subRoutines.map((subRoutine) => `\tSolve ${api.getProblemTypeById(subRoutine.typeId)?.name} ${api.getProblemTypeById(subRoutine.typeId)?.name.toLowerCase()}:\n\t\t\${${snippetJumpIndex++}}`).join("\n")}`;
                        // TODO: add setting if subroutines can have multiple problems or just one problem to solve
                    }

                    acceptor(context, {
                        label: id,
                        kind: CompletionItemKind.Function,
                        documentation: solver.description,
                        insertTextFormat: 2,
                        insertText: insertText,
                    })
                }
                break;
            case ProblemAttributeInt:
                acceptor(context, {
                    label: "size",
                    kind: CompletionItemKind.Property,
                })
                break
            default:
                await super.completionFor(context, next, acceptor);
                break
        }
    }

    protected override async completionForKeyword(context: CompletionContext, keyword: GrammarAST.Keyword, acceptor: CompletionAcceptor): Promise<void> {
        console.log("TEST CompletionProvider keyword", context, keyword, acceptor);
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
                insertText: `foreach \${1:problem} in \${2:problems}:
\t\${3}`,
                kind: CompletionItemKind.EnumMember,
            })
        } else {
            await super.completionForKeyword(context, keyword, acceptor);
        }
    }
}
