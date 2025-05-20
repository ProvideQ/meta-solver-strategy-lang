import { CompletionAcceptor, CompletionContext, DefaultCompletionProvider, NextFeature } from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import { ProblemAttributeInt, ProblemType, SolverID, } from "./generated/ast.js";
import { GrammarAST } from "langium";

export class MetaSolverStrategyCompletionsProvider extends DefaultCompletionProvider {
    protected override  async completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): Promise<void> {
        console.log("TEST CompletionProvider", context, next, acceptor);
        if (next.type === ProblemType) {
            acceptor(context, {
                label: "VRP",
                kind: CompletionItemKind.EnumMember,
            })
            acceptor(context, {
                label: "TSP",
                kind: CompletionItemKind.EnumMember,
            })
            acceptor(context, {
                label: "QUBO",
                kind: CompletionItemKind.EnumMember,
            })
        } else if (next.type === SolverID) {
            // When auto completing this it should automatically generate the subroutines calls too
            acceptor(context, {
                label: "Lkh3",
                kind: CompletionItemKind.Function,
            })
            acceptor(context, {
                label: "Cluster",
                documentation: "", // TODO: Load description from solver
                insertTextFormat: 2,
                insertText: `Cluster(clusters=\${1:3}):
\tSolve TSP[] \${2:tsps}:
\t\t`,
                kind: CompletionItemKind.Function,
            })
            acceptor(context, {
                label: "Qrisp",
                kind: CompletionItemKind.Function,
            })
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
