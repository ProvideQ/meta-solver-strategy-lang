import { CompletionAcceptor, CompletionContext, DefaultCompletionProvider, NextFeature } from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import { ProblemType } from "./generated/ast.js";

export class MetaSolverStrategyCompletionsProvider extends DefaultCompletionProvider {
    protected override  async  completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): Promise<void> {
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
        } else {
            await super.completionFor(context, next, acceptor);
        }
    }
}
