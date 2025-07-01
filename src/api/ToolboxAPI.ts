import { getInvalidProblemDto, ProblemDto } from "./data-model/ProblemDto.ts";
import { ProblemSolverInfo } from "./data-model/ProblemSolverInfo.ts";
import { ProblemState } from "./data-model/ProblemState.ts";
import { SolverSetting } from "./data-model/SolverSettings.ts";
import { SubRoutineDefinitionDto } from "./data-model/SubRoutineDefinitionDto.ts";

/**
 * Getter for the base url of the toolbox API.
 */
export const baseUrl = () => import.meta.env.VITE_API_BASE_URL;

export interface ProblemType {
  id: string;
  description?: string;
}

export const problemTypes : ProblemType[] = [];

export function getProblemType(problemId: string | undefined): ProblemType | undefined {
  return problemTypes.find((problemType) => problemType.id === problemId);
}

export async function initialize() {
  if (problemTypes.length > 0) {
    // Already initialized
    return;
  }

  let newTypes = await getProblemTypes();
  problemTypes.push(...newTypes);
}

export async function getProblemTypes(): Promise<ProblemType[]> {
  return fetch(`${baseUrl()}/problem-types`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(response => response.json())
    .then((json) => json as ProblemType[])
    .catch((reason) => {
      console.error(reason);
      alert("Could not retrieve problem types.");
      return [];
    });
}

export async function getSolver(problemTypeId: string, solverId: string): Promise<ProblemSolverInfo | undefined> {
  const solvers = await fetchSolvers(problemTypeId);
  return solvers.find(s => s.id === solverId);
}

export async function fetchProblem<T>(
  problemTypeId: string,
  problemId: string
): Promise<ProblemDto<T>> {
  return fetch(`${baseUrl()}/problems/${problemTypeId}/${problemId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((json) => {
      const data = json as ProblemDto<T>;

      // Explicitly set solverId to undefined if it is null
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

export async function postProblem<T>(
  problemTypeId: string,
  problemRequest: ProblemDto<T>
): Promise<ProblemDto<T>> {
  return fetch(`${baseUrl()}/problems/${problemTypeId}`, {
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

export async function patchProblem<T>(
  problemTypeId: string,
  problemId: string,
  updateParameters: {
    input?: any;
    solverId?: string;
    state?: ProblemState;
    solverSettings?: SolverSetting[];
  }
): Promise<ProblemDto<T>> {
  return fetch(`${baseUrl()}/problems/${problemTypeId}/${problemId}`, {
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

export async function fetchSolvers(
  problemTypeId: string
): Promise<ProblemSolverInfo[]> {
  return fetch(`${baseUrl()}/solvers/${problemTypeId}`, {
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

export async function fetchSubRoutines(
  problemTypeId: string,
  solverId: string
): Promise<SubRoutineDefinitionDto[]> {
  return fetch(
    `${baseUrl()}/solvers/${problemTypeId}/${solverId}/sub-routines`,
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

export async function fetchSolverSettings(
  problemTypeId: string,
  solverId: string
): Promise<SolverSetting[]> {
  return fetch(`${baseUrl()}/solvers/${problemTypeId}/${solverId}/settings`, {
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

export async function fetchExampleProblems(problemTypeId: string) {
  return fetch(`${baseUrl()}/problems/${problemTypeId}/examples`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((response) => response.json());
}
