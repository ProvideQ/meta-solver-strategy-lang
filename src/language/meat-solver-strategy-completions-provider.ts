import { CompletionAcceptor, CompletionContext, DefaultCompletionProvider, NextFeature } from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import { Foreach, ProblemAttributeInt, ProblemName, ProblemType, SolveProblem, Solver, SolverID, } from "./generated/ast.js";
import { GrammarAST, Reference } from "langium";
import * as api from "../api/ToolboxAPI.ts";

function getProblemType(problemNameRef: Reference<ProblemName>): api.ProblemType | undefined {
    const definitionContainer = problemNameRef.ref?.$container;
    if (definitionContainer === undefined) return;

    if (definitionContainer.$type === SolveProblem) {
        const solveProblem : SolveProblem = definitionContainer as SolveProblem;
        return api.getProblemTypeByName(solveProblem.problemType?.problemType);
    } else if (definitionContainer.$type === Foreach) {
        const foreach: Foreach = definitionContainer as Foreach;
        return api.getProblemTypeByName(foreach.collection.ref?.$container.problemTypes?.problemType.problemType);
    }

    return undefined;
}

export class MetaSolverStrategyCompletionsProvider extends DefaultCompletionProvider {
    protected override  async completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): Promise<void> {
        console.log("TEST CompletionProvider", context, next, acceptor);
        if (next.type === ProblemType) {
            for (const problemType of api.problemTypes) {
                acceptor(context, {
                    label: problemType.name,
                    kind: CompletionItemKind.EnumMember,
                })
            }
        } else if (next.type === SolverID) {
            const solverId: Solver = context.node as Solver;
            if (solverId.problemName === undefined) return;

            const problemType = getProblemType(solverId.problemName)
            if (problemType === undefined) return;

            const solvers = await api.fetchSolvers(problemType.id);
            for (const solver of solvers) {
                const id = solver.id.lastIndexOf(".") > -1 ? solver.id.substring(solver.id.lastIndexOf(".") + 1) : solver.id;
                const subRoutines = await api.fetchSubRoutines(problemType.id, solver.id);
                const settings = await api.fetchSolverSettings(problemType.id, solver.id);

                let snippetJumpIndex = 1;
                
                let insertText = `${id}()`;
                if (settings.length > 0) {
                    insertText = `${id}(\n${settings.map((setting) => `\t${setting.name}=\${${snippetJumpIndex++}}`).join(",\n")})`;
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
        } else if (next.type === ProblemAttributeInt) {
            acceptor(context, {
                label: "size",
                kind: CompletionItemKind.Property,
            })
        } else {
            await super.completionFor(context, next, acceptor);
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
