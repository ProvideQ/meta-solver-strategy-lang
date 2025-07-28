import { getInvalidProblemDto, ProblemDto } from "./data-model/ProblemDto.ts";
import { ProblemSolverInfo } from "./data-model/ProblemSolverInfo.ts";
import { ProblemState } from "./data-model/ProblemState.ts";
import { SolverSetting } from "./data-model/SolverSettings.ts";
import { ProblemTypeDto } from "./data-model/ProblemTypeDto.js";
import { SubRoutineDefinitionDto } from "./data-model/SubRoutineDefinitionDto.ts";

const problemTypes: ProblemTypeDto[] = [];

export class ToolboxApi {
    baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async initialize() {
        if (problemTypes.length > 0) {
            // Already initialized
            return;
        }
        let newTypes = await this.getProblemTypes();
        problemTypes.push(...newTypes);
    }

    getProblemType(problemId: string | undefined): ProblemTypeDto | undefined {
        return problemTypes.find((problemType) => problemType.id === problemId);
    }

    async getProblemTypes(): Promise<ProblemTypeDto[]> {
        return fetch(`${this.baseUrl}/problem-types`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then(response => response.json())
            .then((json) => json as ProblemTypeDto[])
            .catch((reason) => {
                console.error(reason);
                alert("Could not retrieve problem types.");
                return [];
            });
    }

    async fetchSolvers(problemTypeId: string) {
        return fetch(`${this.baseUrl}/solvers/${problemTypeId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then(async (response) => response.json())
            .then((json) => json as ProblemSolverInfo[])
            .catch((reason) => {
                console.error(reason);
                alert(`Could not retrieve solvers of type ${problemTypeId}.`);
                return [];
            });
    }

    async fetchSubRoutines(problemTypeId: string, solverId: string): Promise<SubRoutineDefinitionDto[]> {
        return fetch(
            `${this.baseUrl}/solvers/${problemTypeId}/${solverId}/sub-routines`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        )
            .then((response) => response.json())
            .catch((reason) => {
                console.error(reason);
                alert(`Could not retrieve subroutines of solver ${solverId}.`);
                return [];
            });
    }

    async fetchSolverSettings(problemTypeId: string, solverId: string): Promise<SolverSetting[]> {
        return fetch(`${this.baseUrl}/solvers/${problemTypeId}/${solverId}/settings`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .catch((reason) => {
                console.error(reason);
                alert(`Could not retrieve subroutines of solver ${solverId}.`);
                return [];
            });
    }

    async getSolver(problemTypeId: string, solverId: string) {
        const solvers = await this.fetchSolvers(problemTypeId);
        return solvers.find(s => s.id === solverId);
    }

    async fetchProblem<T>(problemTypeId: string, problemId: string): Promise<ProblemDto<T>> {
        return fetch(`${this.baseUrl}/problems/${problemTypeId}/${problemId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((json) => {
                const data = json as ProblemDto<T>;
                if (data.solverId === null) {
                    data.solverId = undefined;
                }
                return data;
            })
            .catch((reason) => {
                return {
                    ...getInvalidProblemDto(),
                    error: `${reason}`,
                };
            });
    }

    async postProblem<T>(problemTypeId: string, problemRequest: ProblemDto<T>): Promise<ProblemDto<T>> {
        return fetch(`${this.baseUrl}/problems/${problemTypeId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(problemRequest),
        })
            .then((response) => response.json())
            .then((json) => json as ProblemDto<T>)
            .catch((reason) => {
                return {
                    ...problemRequest,
                    error: `${reason}`,
                };
            });
    }

    async patchProblem<T>(problemTypeId: string, problemId: string, updateParameters: {
        input?: any;
        solverId?: string;
        state?: ProblemState;
        solverSettings?: SolverSetting[];
    }): Promise<ProblemDto<T>> {
        return fetch(`${this.baseUrl}/problems/${problemTypeId}/${problemId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updateParameters),
        })
            .then((response) => response.json())
            .then((json) => json as ProblemDto<T>)
            .catch((reason) => {
                return {
                    ...getInvalidProblemDto(),
                    error: `${reason}`,
                };
            });
    }

    async fetchProblemAttribute(problemTypeId: string, problemId: string, attributeName: string): Promise<any> {
        return fetch(`${this.baseUrl}/problems/${problemTypeId}/${problemId}/attributes/${attributeName}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .catch((reason) => {
                console.error(reason);
                alert(`Could not retrieve attribute ${attributeName} of problem ${problemId}.`);
                return undefined;
            });

    }
}
