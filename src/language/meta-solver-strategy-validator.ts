import type { ValidationAcceptor, ValidationChecks } from 'langium';
import { MetaSolverStrategyAstType, ProblemType, ProblemTypes, SolverID } from './generated/ast.js';
import type { MetaSolverStrategyServices } from './meta-solver-strategy-module.js';
import * as api from "../api/ToolboxAPI.ts";
import { getProblemTypeBySolverId } from './utils/ast-utils.ts';

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
            const type = await api.getProblemType(problemType.problemType);
            if (type === undefined) {
                accept('error', `Problem type '${problemType.problemType}' does not exist.`, { node: problemType, property: "problemType" }); 
            }
        }
    }

    async checkProblemTypesExists(problemTypes: ProblemTypes, accept: ValidationAcceptor): Promise<void> {
        if (problemTypes.problemType) {
            const type = await api.getProblemType(problemTypes.problemType.problemType);
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
            const type = await api.getSolver(problemTypeId.id, solverId.solverId);
            if (type === undefined) {
                accept('error', `Solver '${solverId.solverId}' does not exist.`, { node: solverId, property: "solverId" }); 
            }
        }
    }

}
