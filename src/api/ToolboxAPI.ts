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
  name: string;
  description?: string;
}

// TODO: Replace with endpoint to get all problem types
export const problemTypes : ProblemType[] = [
  {
    id: "cluster-vrp",
    name: "ClusterVRP",
    description: "Cluster a Vehicle Routing Problem (VRP) into smaller subproblems.",
  },
  {
    id: "feature-model-anomaly-dead",
    name: "FeatureModelAnomalyDead",
    description: "A searching problem: For a given feature model, check if the model contains dead features.",
  },
  {
    id: "feature-model-anomaly-void",
    name: "FeatureModelAnomalyVoid",
    description: "A searching problem: For a given feature model, check if the model is void.",
  },
  {
    id: "knapsack",
    name: "Knapsack",
    description: "An optimization problem: For given items each with a weight and value, determine which items are part of a collection where the total weight is less than or equal to a given limit and the sum of values is as large as possible.",
  },
  {
    id: "max-cut",
    name: "MaxCut",
    description: "An optimization problem: For a given graph, find the optimal separation of vertices that maximises the cut crossing edge weight sum.",
  },
  {
    id: "qubo",
    name: "Qubo",
    description: "QUBO (Quadratic Unconstrained Binary Optimization) A combinatorial optimization problem. For a given quadratic term with binary decision variables, find the minimal variable assignment of the term.",
  },
  {
    id: "sat",
    name: "SAT",
    description: "A satisfiability problem: For a given boolean formula, check if there is an interpretation that satisfies the formula.",
  },
  {
    id: "sharpsat",
    name: "SharpSAT",
    description: "A satisfiability counting problem: For a given boolean formula, count number of interpretations that satisfies the formula. NP-Hard in nature.",
  },
  {
    id: "tsp",
    name: "TSP",
    description: "A Traveling Sales Person Problem. Optimization Problem with the goal of find an optimal route between a given set of connected cities.",
  },
  {
    id: "vrp",
    name: "VRP",
    description: "A Capacitated Vehicle Routing Problem Optimization Problem with the goal to find a minimal route for a given set of trucks and cities with demand.",
  }
]

export function getProblemTypeById(problemId: string | undefined): ProblemType | undefined {
  return problemTypes.find((problemType) => problemType.id === problemId);
}

export function getProblemTypeByName(problemName: string | undefined): ProblemType | undefined {
  return problemTypes.find((problemType) => problemType.name === problemName);
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
