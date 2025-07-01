import { ComparisonOperator, Expression, Foreach, ProblemName, ProblemType, SolveProblem, Solver, SolverID, SubRoutines } from "../generated/ast.js";
import * as api from "../../api/ToolboxAPI.js";
import { AstNode } from "langium";
import { ProblemTypeDto } from "../../api/data-model/ProblemTypeDto.js";

export function getProblemTypeByProblemName(problemName: ProblemName): ProblemTypeDto | undefined {
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

export function getProblemTypeBySolverId(solverId: SolverID): ProblemTypeDto | undefined {
    if (!solverId.$container.problemName?.ref) return undefined;

    return getProblemTypeByProblemName(solverId.$container.problemName.ref);
}

export function getProblemType(astNode: AstNode): ProblemTypeDto | undefined {
    if (astNode.$type === SolverID) {
        return getProblemTypeBySolverId(astNode as SolverID);
    } else if (astNode.$type === Solver) {
        const solver: Solver = astNode as Solver;
        if (solver.solverId) {
            return getProblemTypeBySolverId(solver.solverId);
        } else {
            const problemName = solver.problemName.ref;
            if (problemName) {
                return getProblemTypeByProblemName(problemName)
            }
        }
    } else if (astNode.$type === SubRoutines) {
        const subRoutines: SubRoutines = astNode as SubRoutines;
        return getProblemTypeBySolverId(subRoutines.$container.solverId);
    } else if (astNode.$type === Expression) {
        const expression: Expression = astNode as Expression;
        const problemName = expression.problemName?.ref;
        if (!problemName) return undefined;

        return getProblemTypeByProblemName(problemName);
    }
    return undefined;
}

export function getSolverIdNode(astNode: AstNode): SolverID | undefined {
    if (astNode.$type === SolverID) {
        return astNode as SolverID;
    } else if (astNode.$type === Solver) {
        const solver: Solver = astNode as Solver;
        return solver.solverId;
    } else if (astNode.$type === SubRoutines) {
        const subRoutines: SubRoutines = astNode as SubRoutines;
        return subRoutines.$container.solverId;
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
        } else {
            return solveProblem.problemTypes?.problemType
        }
    }
    return undefined;
}

export function getType(expression: Expression): string | undefined {
    if (expression.string) return "string";
    if (expression.int) return "number";

    return undefined;
}

export function getApplicableTypes(operator: ComparisonOperator): string[] {
    switch (operator) {
        case "==":
            return ["string", "number"];
        case "!=":
            return ["string", "number"];
        case "<":
            return ["number"];
        case "<=":
            return ["number"];
        case ">":
            return ["number"];
        case ">=":
            return ["number"];
    }
}
