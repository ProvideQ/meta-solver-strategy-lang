import { Foreach, ProblemName, ProblemType, SolveProblem, Solver, SolverID, SubRoutines } from "../generated/ast.js";
import * as api from "../../api/ToolboxAPI.js";
import { AstNode } from "langium";

export function getProblemTypeByProblemName(problemName: ProblemName): api.ProblemType | undefined {
    const definitionContainer = problemName.$container;
    if (definitionContainer === undefined) return;

    if (definitionContainer.$type === SolveProblem) {
        const solveProblem: SolveProblem = definitionContainer as SolveProblem;
        return api.getProblemType(solveProblem.problemType?.problemType);
    } else if (definitionContainer.$type === Foreach) {
        const foreach: Foreach = definitionContainer as Foreach;
        return api.getProblemType(foreach.collection.ref?.$container.problemTypes?.problemType.problemType);
    }

    return undefined;
}

export function getProblemTypeBySolverId(solverId: SolverID): api.ProblemType | undefined {
    if (!solverId.$container.problemName?.ref) return undefined;

    return getProblemTypeByProblemName(solverId.$container.problemName.ref);
}

export function getSolverIdNode(astNode: AstNode): SolverID | undefined {
    if (astNode.$type === SolverID) {
        return astNode as SolverID;
    } else if (astNode.$type === Solver) {
        const solver: Solver = astNode as Solver;
        return solver.solverId;
    } else if (astNode.$type === SubRoutines) {
        const subRoutines: SubRoutines = astNode as SubRoutines;
        return subRoutines.solverId;
    }
    return undefined;
}

export function getProblemTypeNode(astNode: AstNode): ProblemType | undefined {
    if (astNode.$type === ProblemType) {
        return astNode as ProblemType;
    } else if (astNode.$type === SolveProblem) {
        const solveProblem: SolveProblem = astNode as SolveProblem;
        if (solveProblem.problemType) {
            return solveProblem.problemType;
        }
        else {
            return solveProblem.problemTypes?.problemType
        }
    }
    return undefined;
}
