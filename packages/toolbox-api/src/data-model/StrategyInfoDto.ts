/**
 * A meta solver strategy that has been saved in the interpreter backend and can
 * be reused as a nested strategy call inside other meta solver strategies.
 */
export interface StrategyInfoDto {
  /**
   * Unique identifier of the strategy.
   */
  id: string;
  /**
   * Human readable name of the strategy. This is the name that is used to
   * reference the strategy inside a meta solver strategy.
   */
  name: string;
  /**
   * The source code of the meta solver strategy.
   */
  code: string;
  /**
   * Identifies the problem type that this strategy solves.
   */
  problemTypeId: string;
}
