import { LangiumCoreServices, LangiumDocument, URI } from "langium";
import { NodeFileSystem } from 'langium/node';
import { BoolExpression, createMetaSolverStrategyServices, Expression, Foreach, If, ProblemArrayName, ProblemName, Solve, SolveProblem, Solver } from 'langium-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ProblemDto, ProblemState, SolverSetting as ApiSolverSetting } from "toolbox-api";
import { toolboxApi } from './api.ts';

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
        return Promise.reject("Failed to parse the document " + strategy.id + ". Lexer errors: " + doc.parseResult.lexerErrors.length + ", Parser errors: " + doc.parseResult.parserErrors.length);
    }

    const result = doc.parseResult.value;
    if (result.$type === SolveProblem) {
        const node = result as SolveProblem;
        if (node.problemType && node.problemName.$type == ProblemName) {
            const problem = await toolboxApi.fetchProblem(node.problemType.problemType, problemId);

            visitSolveProblem(result as SolveProblem, [problem], {
                variables: new Map<ProblemName, ProblemDto<any>>(),
                arrays: new Map<ProblemArrayName, ProblemDto<any>[]>()
            });
        }
    }
}

export interface MetaSolverStrategyContext {
    // Variable name -> solver id
    variables: Map<ProblemName, ProblemDto<any>>
    arrays: Map<ProblemArrayName, ProblemDto<any>[]>
}

export async function visitSolveProblem(node: SolveProblem, problems: ProblemDto<any>[], context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.problemType && node.problemName.$type == ProblemName) {
        context.variables.set(node.problemName, problems[0]);

        if (node.solve.$type === Solver) {
            return await visitSolver(node.solve, context);
        } else if (node.solve.$type === If) {
            return await visitIf(node.solve, context);
        }
    } else if (node.problemTypes && node.problemName.$type == ProblemArrayName) {
        context.arrays.set(node.problemName, problems);

        if (node.solve.$type === Foreach) {
            return await visitForeach(node.solve, context);
        }
    }

    return Promise.reject("Unsupported SolveProblem node: " + node.$type);
}

export async function visitSolve(node: Solve, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.$type === If) {
        return await visitIf(node, context);
    } else if (node.$type === Solver) {
        return await visitSolver(node, context);
    }

    return Promise.reject("Unsupported node type: " + node.$type);
}

export async function visitSolver(node: Solver, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.problemName.ref === undefined) {
        return Promise.reject("Solver problem name is not defined");
    }

    const problem = await context.variables.get(node.problemName.ref);
    if (problem?.typeId === undefined) {
        return Promise.reject("Problem not found for solver: " + node.problemName.ref.name);
    }

    // Update solver, solver settings and start solving the problem
    const settings = await toolboxApi.fetchSolverSettings(problem.typeId, node.solverId.solverId);
    const solution = await toolboxApi.patchProblem(problem?.typeId, problem?.id, {
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

    // Run all subroutines for the problem
    if (node.subRoutines?.subRoutine) {
        for (const subRoutine of node.subRoutines?.subRoutine) {
            const problemType = subRoutine.problemType?.problemType ?? subRoutine.problemTypes?.problemType.problemType;
            if (problemType === undefined) continue;

            const subProblem = solution.subProblems.find(p => p.subRoutine.typeId === problemType);
            if (subProblem === undefined) {
                return Promise.reject("No sub problems found for sub routine: " + problemType);
            }

            const problems: ProblemDto<any>[] = [];
            for (const subProblemId of subProblem!.subProblemIds) {
                const subProblemDto = await toolboxApi.fetchProblem(problemType, subProblemId);
                if (subProblemDto) {
                    problems.push(subProblemDto);
                } else {
                    return Promise.reject("Sub problem not found: " + subProblemId);
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

        if (node.condition.length <= i) {
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

    return Promise.reject("No valid way to solve the problem found in if / else statement");
}

export async function visitBoolExpression(node: BoolExpression, context: MetaSolverStrategyContext): Promise<boolean> {
    if (node.$cstNode?.text === "true") {
        return true;
    } else if (node.$cstNode?.text === "false") {
        return false;
    } else if (node.lhs && node.operator && node.rhs) {
        const lhs = visitExpression(node.lhs, context);
        const rhs = visitExpression(node.rhs, context);

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

    return Promise.reject("Unsupported boolean expression: " + node.$cstNode?.text);
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
                return Promise.reject("Problem type not found for problem: " + node.problemName.ref.name);
            }

            const attribute = problemType?.attributes.find(attr => attr === node.attribute?.name);
            if (!attribute) {
                return Promise.reject("Attribute " + node.attribute?.name + " not found in problem type " + problemType.id);
            }

            return await toolboxApi.fetchProblemAttribute(problemType?.id, problem.id, attribute);
        } else {
            return Promise.reject("Problem not found: " + node.problemName.ref.name);
        }
    }

    return Promise.reject("Unsupported expression type: " + node.$type);
}

export async function visitForeach(node: Foreach, context: MetaSolverStrategyContext): Promise<ProblemDto<any> | undefined> {
    if (node.collection.ref === undefined) {
        throw new Error("Foreach collection is not defined");
    }

    const problemArray = context.arrays.get(node.collection.ref);
    if (problemArray === undefined) {
        throw new Error("Foreach collection "+ node.collection.ref.$cstNode?.text + " is not defined in context");
    }

    // TODO: parallelize this
    for (const problem of problemArray) {
        context.variables.set(node.variable, problem);
        await visitSolve(node.solve, context);
    }

    // TODO
    return undefined;
}

export async function inferProblemTypeIdFromCode(code: string): Promise<{ problemTypeId?: string, error?: string }> {
    try {
        const services = createMetaSolverStrategyServices(toolboxApi, NodeFileSystem).MetaSolverStrategy;
        const doc = await extractDocument(code, services);
        const result = doc.parseResult.value;
        if (result && result.$type === SolveProblem) {
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
    }
    return { problemTypeId: undefined, error: "Failed to infer problem type ID from code" };
}
