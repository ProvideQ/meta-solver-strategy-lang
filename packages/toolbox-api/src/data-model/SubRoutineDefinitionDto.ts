/**
 * A sub-routine definition describes which problem type needs to be solved by a
 * sub-routine and why it needs to be solved.
 */
export interface SubRoutineDefinitionDto {
  /**
   * Identifies the type of problem that needs to be solved with the described
   * sub-routine.
   */
  typeId: string;
  /**
   * Describes why this sub-routine is required to solve a bigger problem.
   */
  description: string;
  /**
   * Indicates whether this sub-routine is called only once when the solver
   * solves a problem or whether it can be called multiple times.
   */
  isCalledOnlyOnce: boolean;
}
