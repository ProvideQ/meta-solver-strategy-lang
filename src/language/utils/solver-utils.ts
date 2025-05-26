import { ProblemSolverInfo } from "../../api/data-model/ProblemSolverInfo.js";

export function getSimpleSolverName(solver: ProblemSolverInfo): string {
    return solver.id.lastIndexOf(".") > -1
        ? solver.id.substring(solver.id.lastIndexOf(".") + 1)
        : solver.id;
}
