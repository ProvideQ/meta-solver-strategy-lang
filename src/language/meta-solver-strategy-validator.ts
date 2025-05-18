import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { MetaSolverStrategyAstType, Person } from './generated/ast.js';
import type { MetaSolverStrategyServices } from './meta-solver-strategy-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: MetaSolverStrategyServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.MetaSolverStrategyValidator;
    const checks: ValidationChecks<MetaSolverStrategyAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class MetaSolverStrategyValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
