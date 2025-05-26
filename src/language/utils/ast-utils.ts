import { Foreach, ProblemName, SolveProblem } from "../generated/ast.js";
import * as api from "../../api/ToolboxAPI.js";

export function getProblemType(problemName: ProblemName): api.ProblemType | undefined {
    const definitionContainer = problemName.$container;
    if (definitionContainer === undefined) return;

    if (definitionContainer.$type === SolveProblem) {
        const solveProblem: SolveProblem = definitionContainer as SolveProblem;
        return api.getProblemTypeByName(solveProblem.problemType?.problemType);
    } else if (definitionContainer.$type === Foreach) {
        const foreach: Foreach = definitionContainer as Foreach;
        return api.getProblemTypeByName(foreach.collection.ref?.$container.problemTypes?.problemType.problemType);
    }

    return undefined;
}
