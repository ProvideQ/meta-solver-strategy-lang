import { ComparisonOperator, Expression, Foreach, ProblemName, ProblemType, SolveProblem, Solver, SolverID, SubRoutines } from '../generated/ast.ts';
import { AstNode } from "langium";
import { ProblemTypeDto, ToolboxApi } from 'toolbox-api';

export function getProblemTypeByProblemName(api: ToolboxApi, problemName: ProblemName): ProblemTypeDto | undefined {
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

export function getProblemTypeBySolverId(api: ToolboxApi, solverId: SolverID): ProblemTypeDto | undefined {
    if (!solverId.$container.problemName?.ref) return undefined;

    return getProblemTypeByProblemName(api, solverId.$container.problemName.ref);
}

export function getProblemType(api: ToolboxApi, astNode: AstNode): ProblemTypeDto | undefined {
    if (astNode.$type === SolverID) {
        return getProblemTypeBySolverId(api, astNode as SolverID);
    } else if (astNode.$type === Solver) {
        const solver: Solver = astNode as Solver;
        if (solver.solverId) {
            return getProblemTypeBySolverId(api, solver.solverId);
        } else {
            const problemName = solver.problemName.ref;
            if (problemName) {
                return getProblemTypeByProblemName(api, problemName)
            }
        }
    } else if (astNode.$type === SubRoutines) {
        const subRoutines: SubRoutines = astNode as SubRoutines;
        return getProblemTypeBySolverId(api, subRoutines.$container.solverId);
    } else if (astNode.$type === Expression) {
        const expression: Expression = astNode as Expression;
        const problemName = expression.problemName?.ref;
        if (!problemName) return undefined;

        return getProblemTypeByProblemName(api, problemName);
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
