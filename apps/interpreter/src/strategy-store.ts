import { MetaSolverStrategy } from './interpreter.js';

/**
 * In-memory store for saved meta solver strategies.
 *
 * The store is shared between the strategy controller (which manages CRUD
 * operations) and the interpreter (which resolves nested strategy calls).
 */
class StrategyStore {
    private readonly strategies = new Map<string, MetaSolverStrategy>();

    set(strategy: MetaSolverStrategy): void {
        this.strategies.set(strategy.id, strategy);
    }

    get(id: string): MetaSolverStrategy | undefined {
        return this.strategies.get(id);
    }

    delete(id: string): boolean {
        return this.strategies.delete(id);
    }

    list(problemTypeId?: string): MetaSolverStrategy[] {
        const all = Array.from(this.strategies.values());
        return problemTypeId
            ? all.filter(s => s.problemTypeId === problemTypeId)
            : all;
    }

    /**
     * Finds a strategy by its human readable name and problem type.
     *
     * Strategy names must be unique per problem type so that a strategy call
     * like `sharpsat.SolveSharpSatWithGanak()` can be resolved unambiguously.
     */
    byNameAndType(name: string, problemTypeId: string): MetaSolverStrategy | undefined {
        return this.list(problemTypeId).find(s => s.name === name);
    }
}

export const strategyStore = new StrategyStore();
