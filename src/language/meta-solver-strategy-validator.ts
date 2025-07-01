import { type ValidationAcceptor, type ValidationChecks } from 'langium';
import { BoolExpression, MetaSolverStrategyAstType, ProblemAttribute, ProblemType, ProblemTypes, SolveProblem, SolverID, SolverSetting, SubRoutines } from './generated/ast.js';
import type { MetaSolverStrategyServices } from './meta-solver-strategy-module.js';
import * as api from "../api/ToolboxAPI.ts";
import { getApplicableTypes, getProblemTypeByProblemName, getProblemTypeBySolverId, getType } from './utils/ast-utils.ts';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: MetaSolverStrategyServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.MetaSolverStrategyValidator;
    const checks: ValidationChecks<MetaSolverStrategyAstType> = {
        ProblemType: validator.checkProblemTypeExists,
        ProblemTypes: validator.checkProblemTypesExists,
        SolverID: validator.checkSolverIDExists,
        SolverSetting: validator.checkSolverSettingExists,
        ProblemAttribute: validator.checkProblemAttributeExists,
        BoolExpression: validator.checkBoolExpressionTypes,
        SubRoutines: validator.checkSubRoutines,
        SolveProblem: validator.checkSolveProblem,
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class MetaSolverStrategyValidator {

    async checkProblemTypeExists(problemType: ProblemType, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking
        if (problemType.problemType) {
            const type = api.getProblemType(problemType.problemType);
            if (type === undefined) {
                accept('error', `Problem type '${problemType.problemType}' does not exist.`, { node: problemType, property: "problemType" }); 
            }
        }
    }
    
    async checkProblemTypesExists(problemTypes: ProblemTypes, accept: ValidationAcceptor): Promise<void> {
        if (problemTypes.problemType) {
            const type = api.getProblemType(problemTypes.problemType.problemType);
            if (type === undefined) {
                accept('error', `Problem type '${problemTypes.problemType.problemType}' does not exist.`, { node: problemTypes, property: "problemType" }); 
            }
        }
    }

    async checkSolverIDExists(solverId: SolverID, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking
        const problemTypeId = getProblemTypeBySolverId(solverId);
        if (!problemTypeId) {
            accept('error', `Solver ID '${solverId.solverId}' is not associated with any problem type.`, { node: solverId, property: "solverId" });
            return;
        }

        if (solverId.solverId) {
            const solver = await api.getSolver(problemTypeId.id, solverId.solverId);
            if (solver === undefined) {
                accept('error', `Solver '${solverId.solverId}' does not exist.`, { node: solverId, property: "solverId" }); 
            }
        }
    }

    async checkSolverSettingExists(solverSetting: SolverSetting, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking
        const solverId = solverSetting.$container.solverId;
        const problemTypeId = getProblemTypeBySolverId(solverId);
        if (!problemTypeId) {
            accept('error', `Solver ID '${solverId.solverId}' is not associated with any problem type.`, { node: solverId, property: "solverId" });
            return;
        }

        if (solverId.solverId) {
            const settings = await api.fetchSolverSettings(problemTypeId.id, solverId.solverId);
            if (settings.filter(setting => setting.name === solverSetting.settingName).length === 0) {
                accept('error', `Solver setting '${solverSetting.settingName}' does not exist for solver '${solverId.solverId}'.`, { node: solverSetting, property: "settingName" });
            }
        }
    }

    async checkProblemAttributeExists(problemAttribute: ProblemAttribute, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking

        const problemName = problemAttribute.$container.problemName?.ref;
        if (!problemName) {
            accept('error', 'Problem name is required for problem attributes.', { node: problemAttribute.$container, property: "problemName" });
            return;
        }

        const problemTypeId = getProblemTypeByProblemName(problemName);
        if (!problemTypeId) {
            accept('error', `Problem type for problem name '${problemName.name}' does not exist.`, { node: problemAttribute.$container, property: "problemName" });
            return;
        }

        if (!problemTypeId.attributes.includes(problemAttribute.name)) {
            accept('error', `Problem attribute '${problemAttribute.name}' does not exist for problem type '${problemTypeId.id}'.`, { node: problemAttribute, property: "name" });
        }
    }

    async checkBoolExpressionTypes(boolExpression: BoolExpression, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking

        if (boolExpression.operator && boolExpression.lhs && boolExpression.rhs) {
            const applicableTypes = getApplicableTypes(boolExpression.operator);

            const lhsType = getType(boolExpression.lhs);
            const rhsType = getType(boolExpression.rhs);
            
            const errorMessage = (expressionType: string) => `Expression has type '${expressionType}' but comparison operator '${boolExpression.operator}' is only applicable to ${applicableTypes.map(x => "'" + x + "'").join(' or ')}.`;

            if (lhsType && !applicableTypes.includes(lhsType)) {
                accept('error', errorMessage(lhsType), { node: boolExpression, property: "lhs" });
            }

            if (rhsType && !applicableTypes.includes(rhsType)) {
                accept('error', errorMessage(rhsType), { node: boolExpression, property: "rhs" });
            }
        }
    }

    async checkSubRoutines(subRoutines: SubRoutines, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking

        const solverId = subRoutines.$container.solverId.solverId;
        const problemTypeId = getProblemTypeBySolverId(subRoutines.$container.solverId);
        if (!problemTypeId) {
            accept('error', `Solver ID '${solverId}' is not associated with any problem type.`, { node: subRoutines.$container.solverId, property: "solverId" });
            return;
        }

        const solverSubRoutines = await api.fetchSubRoutines(problemTypeId.id, solverId);

        for (let subRoutine of subRoutines.subRoutine) {
            if (subRoutine.problemType) {
                const routine = solverSubRoutines.find(r => r.typeId === subRoutine.problemType?.problemType);
                if (routine) {
                    if (!routine.isCalledOnlyOnce) {
                        accept('error', `Subroutine for problem type '${subRoutine.problemType.problemType}' can be called multiple times and should use an array of problem types ${routine.typeId}[].`, {
                            node: subRoutine,
                            property: "problemType"
                        });
                    }
                } else {
                    accept('error', `Subroutine for problem type '${subRoutine.problemType.problemType}' does not exist for solver '${solverId}'.`, {
                        node: subRoutine,
                        property: "problemType"
                    });
                }
            } else if (subRoutine.problemTypes) {
                const routine = solverSubRoutines.find(r => r.typeId === subRoutine.problemTypes?.problemType.problemType);
                if (routine) {
                    if (routine.isCalledOnlyOnce) {
                        accept('error', `Subroutine for problem types '${subRoutine.problemTypes.problemType.problemType}' can only be called once and should not use an array of problem types.`, {
                            node: subRoutine,
                            property: "problemTypes"
                        });
                    }
                } else {
                    accept('error', `Subroutine for problem types '${subRoutine.problemTypes.problemType.problemType}' does not exist for solver '${solverId}'.`, {
                        node: subRoutine,
                        property: "problemTypes"
                    });
                }
            }
        }
    }

    async checkSolveProblem(solveProblem: SolveProblem, accept: ValidationAcceptor): Promise<void> {
        await api.initialize(); // Ensure problem types are initialized before checking

        if (solveProblem.$container === undefined && solveProblem.problemTypes) {
            accept('error', 'Root solve problem cannot solve an array of problem types. Use a single problem type instead.', {
                node: solveProblem,
                property: "problemTypes"
            });
        }
    }

}
