import { LangiumCoreServices, LangiumDocument, URI } from "langium";
import { NodeFileSystem } from 'langium/node';
import { BoolExpression, createMetaSolverStrategyServices, Else, Expression, Foreach, If, isIf, ProblemArrayName, ProblemName, Solve, SolveProblem, Solver } from 'langium-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ProblemDto, ProblemState, SolverSetting as ApiSolverSetting, ToolboxApi } from "toolbox-api";

const apiBaseUrl = process.env.TOOLBOX_API_URL;
if (!apiBaseUrl) {
    throw new Error('TOOLBOX_API_URL environment variable is not set');
}
console.log("Using Toolbox API base URL:", apiBaseUrl);
export const toolboxApi = new ToolboxApi(apiBaseUrl);

toolboxApi.initialize();

export interface MetaSolverStrategy {
    id: string;
    name: string;
    code: string;
    problemTypeId: string;
}

export async function extractDocument(code: string, services: LangiumCoreServices): Promise<LangiumDocument> {
    // Create a temporary file to hold the strategy code
    const tmpFile = path.join(process.cwd(), 'tmp-strategy.mss');
    await fs.promises.writeFile(tmpFile, code, 'utf-8');

    const document = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(tmpFile));
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });

    // Clean up the temporary file
    await fs.promises.unlink(tmpFile);

    return document;
}

export async function solve(strategy: MetaSolverStrategy, problemId: string) {
    const services = createMetaSolverStrategyServices(toolboxApi, NodeFileSystem).MetaSolverStrategy;
    const doc = await extractDocument(strategy.code, services);
    if (doc.parseResult.lexerErrors.length > 0 || doc.parseResult.parserErrors.length > 0) {
        throw new Error("Failed to parse the document " + strategy.id + ". Lexer errors: " + doc.parseResult.lexerErrors.length + ", Parser errors: " + doc.parseResult.parserErrors.length);
    }

    const result = doc.parseResult.value;
    if (result.$type === SolveProblem.$type) {
        const node = result as SolveProblem;
        if (node.problemType && node.problemName.$type === ProblemName.$type) {
            const problem = await toolboxApi.fetchProblem(node.problemType.problemType, problemId);
            if (problem.error) {
                throw new Error("Failed to fetch " + node.problemType.problemType + " problem " + problemId + ": " + problem.error);
            }

            return await visitSolveProblem(result as SolveProblem, [problem], {
                variables: new Map<ProblemName, ProblemDto<any>>(),
                arrays: new Map<ProblemArrayName, ProblemDto<any>[]>()
            });
        }
    }

    throw new Error("Unsupported root node type: " + result.$type);
}

export interface MetaSolverStrategyContext {
    // Variable name -> solver id
    variables: Map<ProblemName, ProblemDto<any>>
    arrays: Map<ProblemArrayName, ProblemDto<any>[]>
}

export async function visitSolveProblem(node: SolveProblem, problems: ProblemDto<any>[], context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.problemType && node.problemName.$type == ProblemName.$type) {
        context.variables.set(node.problemName, problems[0]);

        if (node.solve.$type === Solver.$type) {
            return await visitSolver(node.solve, context);
        } else if (isIf(node.solve)) {
            return await visitIf(node.solve, context);
        }
    } else if (node.problemTypes && node.problemName.$type == ProblemArrayName.$type) {
        context.arrays.set(node.problemName, problems);

        if (node.solve.$type === Foreach.$type) {
            return await visitForeach(node.solve, context);
        }
    }

    throw new Error("Unsupported SolveProblem node: " + node.$type);
}

export async function visitSolve(node: Solve, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.$type === If.$type || node.$type === Else.$type) {
        return await visitIf(node, context);
    } else if (node.$type === Solver.$type) {
        return await visitSolver(node, context);
    }

    throw new Error("Unsupported node type: " + node.$type);
}

export async function visitSolver(node: Solver, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.problemName.ref === undefined) {
        throw new Error("Solver problem name is not defined");
    }

    const problem = context.variables.get(node.problemName.ref);
    if (problem?.typeId === undefined) {
        throw new Error("Problem not found for solver: " + node.problemName.ref.name);
    }

    // Update solver, solver settings and start solving the problem
    const settings = await toolboxApi.fetchSolverSettings(problem.typeId, node.solverId.solverId);
    let solution: ProblemDto<unknown> = await toolboxApi.patchProblem(problem?.typeId, problem?.id, {
        solverId: node.solverId.solverId,
        solverSettings: node.settings
        .map(setting => {
            const s = settings.find(s => s.name === setting.settingName);

            return {
                ...s,
                name: setting.settingName,
                value: setting.settingValue,
            } as ApiSolverSetting;
        })
        .filter(setting => setting !== undefined),
        state: ProblemState.SOLVING,
    });

    if (solution.error) {
        solution = await toolboxApi.fetchProblem(problem.typeId, problem.id);
    }

    // Run all subroutines for the problem
    const subRoutines = node.subRoutines?.subRoutine;
    if (subRoutines) {
        for (const subRoutine of subRoutines) {
            const problemType = subRoutine.problemType?.problemType ?? subRoutine.problemTypes?.problemType.problemType;
            if (problemType === undefined) continue;

            const subProblem = solution.subProblems.find(p => p.subRoutine.typeId === problemType);
            if (subProblem === undefined) {
                throw new Error("No sub problems found for sub routine: " + problemType);
            }

            const problems: ProblemDto<any>[] = [];
            for (const subProblemId of subProblem.subProblemIds) {
                const subProblemDto = await toolboxApi.fetchProblem(problemType, subProblemId);
                if (subProblemDto) {
                    problems.push(subProblemDto);
                } else {
                    throw new Error("Sub problem not found: " + subProblemId);
                }
            }

            await visitSolveProblem(subRoutine, problems, context);
        }
    }

    // Return the solution to the problem after all subroutines have been executed
    return await toolboxApi.fetchProblem(problem.typeId, solution.id);
}

export async function visitIf(node: If, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    // If and else are set up as a list of conditions and solves, so we iterate through them
    // and execute the first condition that evaluates to true
    for (let i = 0; i < node.solve.length; i++) {
        const solve = node.solve[i];

        if (i < node.condition.length) {
            const condition = node.condition[i];

            const conditionResult = await visitBoolExpression(condition, context);
            if (conditionResult) {
                return await visitSolve(solve, context);
            }
        } else {
            // Else case
            return await visitSolve(solve, context);
        }
    }

    throw new Error("No valid way to solve the problem found in if / else statement");
}

export async function visitBoolExpression(node: BoolExpression, context: MetaSolverStrategyContext): Promise<boolean> {
    if (node.$cstNode?.text === "true") {
        return true;
    } else if (node.$cstNode?.text === "false") {
        return false;
    } else if (node.lhs && node.operator && node.rhs) {
        const lhs = await visitExpression(node.lhs, context);
        const rhs = await visitExpression(node.rhs, context);

        switch (node.operator) {
            case "==":
                return lhs === rhs;
            case "!=":
                return lhs !== rhs;
            case "<":
                return lhs < rhs;
            case "<=":
                return lhs <= rhs;
            case ">":
                return lhs > rhs;
            case ">=":
                return lhs >= rhs;
            default:
                break;
        }
    }

    throw new Error("Unsupported boolean expression: " + node.$cstNode?.text);
}

export async function visitExpression(node: Expression, context: MetaSolverStrategyContext): Promise<any> {
    if (node.int) {
        return node.int;
    } else if (node.string) {
        return node.string;
    } else if (node.problemName?.ref && node.attribute) {
        const problem = context.variables.get(node.problemName.ref);
        if (problem) {
            const problemType = toolboxApi.getProblemType(problem.typeId);
            if (!problemType) {
                throw new Error("Problem type not found for problem: " + node.problemName.ref.name);
            }

            const attribute = problemType?.attributes.find((attr: string) => attr === node.attribute?.name);
            if (!attribute) {
                throw new Error("Attribute " + node.attribute?.name + " not found in problem type " + problemType.id);
            }

            return await toolboxApi.fetchProblemAttribute(problemType?.id, problem.id, attribute);
        } else {
            throw new Error("Problem not found: " + node.problemName.ref.name);
        }
    }

    throw new Error("Unsupported expression type: " + node.$type);
}

export async function visitForeach(node: Foreach, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.collection.ref === undefined) {
        throw new Error("Foreach collection is not defined");
    }

    const problemArray = context.arrays.get(node.collection.ref);
    if (problemArray === undefined) {
        throw new Error("Foreach collection "+ node.collection.ref.$cstNode?.text + " is not defined in context");
    }

    // Create a task for each problem in the array
    const tasks = problemArray.map(problem => {
        const branchContext: MetaSolverStrategyContext = {
            // deep copy of the context for each branch
            variables: new Map(context.variables),
            arrays: new Map(context.arrays)
        };
        branchContext.variables.set(node.variable, problem);
        return visitSolve(node.solve, branchContext);
    });

    // Wait for all tasks to complete
    await Promise.all(tasks);

    // Foreach does not return a value
    return undefined;
}

export async function inferProblemTypeIdFromCode(code: string): Promise<{ problemTypeId?: string, error?: string }> {
    try {
        const services = createMetaSolverStrategyServices(toolboxApi, { ...NodeFileSystem }).MetaSolverStrategy;
        const doc = await extractDocument(code, services);
        const result = doc.parseResult.value;
        if (result && result.$type === SolveProblem.$type) {
            const node = result as SolveProblem;
            if (node.problemType) {
                return {
                    problemTypeId: node.problemType.problemType
                };
            }
            return {
                error: JSON.stringify(doc.parseResult.lexerErrors) + JSON.stringify(doc.parseResult.parserErrors)
            };
        }
    } catch (e) {
        // fallback or log error
        console.error("Error inferring problem type ID from code:", e);
    }
    return { problemTypeId: undefined, error: "Failed to infer problem type ID from code" };
}
