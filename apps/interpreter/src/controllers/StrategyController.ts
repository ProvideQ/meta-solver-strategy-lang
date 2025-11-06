import { Controller, Route, Post, Get, Patch, Body, Path, Query, Delete } from 'tsoa';
import { v4 as uuidv4 } from 'uuid';
import { solve, inferProblemTypeIdFromCode, MetaSolverStrategy } from '../interpreter.ts';

export interface MetaSolverStrategyInput {
    code: string;
    name: string;
}

export interface MetaSolverStrategyResponse {
    id: string;
    name: string;
}

export interface ExecuteStrategyInput {
    problemId: string;
}

export interface UpdateStrategyInput {
    code?: string;
    name?: string;
}

@Route("strategies")
export class StrategyController extends Controller {
    private static readonly strategies = new Map<string, MetaSolverStrategy>();

    @Post()
    public async saveStrategy(
        @Body() body: MetaSolverStrategyInput
    ): Promise<MetaSolverStrategy> {
        const { problemTypeId, error } = await inferProblemTypeIdFromCode(body.code);
        if (!problemTypeId || error) {
            this.setStatus(400);
            throw new Error('Code is not valid ' + error);
        }
        const id = uuidv4();
        const strategy = { ...body, id, problemTypeId };
        StrategyController.strategies.set(id, strategy);
        return strategy;
    }

    @Patch("{id}")
    public async updateStrategy(
        @Path() id: string,
        @Body() body: UpdateStrategyInput
    ): Promise<MetaSolverStrategyResponse & MetaSolverStrategyInput> {
        const strategy = StrategyController.strategies.get(id);
        if (!strategy) {
            this.setStatus(404);
            throw new Error('Strategy not found');
        }
        if (body.code !== undefined) {
            const { problemTypeId, error } = await inferProblemTypeIdFromCode(body.code);
            if (!problemTypeId || error) {
                this.setStatus(400);
                throw new Error('Code is not valid ' + error);
            }
            strategy.problemTypeId = problemTypeId;
            strategy.code = body.code;
        }
        if (body.name !== undefined) {
            strategy.name = body.name;
        }
        StrategyController.strategies.set(id, strategy);
        return strategy;
    }

    @Get("{id}")
    public async getStrategy(@Path() id: string): Promise<MetaSolverStrategy | undefined> {
        return StrategyController.strategies.get(id);
    }

    @Get()
    public async listStrategies(@Query("type") type?: string): Promise<MetaSolverStrategy[]> {
        return type
            ? Array.from(StrategyController.strategies.values()).filter(s => s.problemTypeId === type)
            : Array.from(StrategyController.strategies.values());
    }

    @Delete("{id}")
    public async deleteStrategy(@Path() id: string): Promise<{ success: boolean }> {
        const existed = StrategyController.strategies.delete(id);
        if (!existed) {
            this.setStatus(404);
            throw new Error('Strategy not found');
        }
        return { success: true };
    }

    @Post("{strategyId}/execute")
    public async executeStrategy(
        @Path() strategyId: string,
        @Body() body: ExecuteStrategyInput
    ): Promise<{ result: any }> {
        const strategy = StrategyController.strategies.get(strategyId);
        if (!strategy) {
            this.setStatus(404);
            throw new Error('Strategy not found');
        }
        if (!body.problemId) {
            this.setStatus(400);
            throw new Error('Missing problemId');
        }
        const result = await solve(strategy, body.problemId);
        return { result };
    }
}
