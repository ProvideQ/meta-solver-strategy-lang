import { Controller, Post, Get, Patch, Body, Param, Query, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { solve, inferProblemTypeIdFromCode, MetaSolverStrategy } from '../interpreter.js';
import {
    ApiTags,
    ApiOperation,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiBody,
    ApiQuery,
    ApiParam,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiProperty,
} from '@nestjs/swagger';

export class MetaSolverStrategyInput {
    @ApiProperty({ description: 'Strategy source code', type: String })
    code!: string;

    @ApiProperty({ description: 'Strategy name', type: String })
    name!: string;
}

export class ExecuteStrategyInput {
    @ApiProperty({ description: 'Problem id to execute the strategy against', type: String })
    problemId!: string;
}

export class UpdateStrategyInput {
    @ApiProperty({ description: 'Updated code for the strategy', required: false, type: String })
    code?: string;

    @ApiProperty({ description: 'Updated name for the strategy', required: false, type: String })
    name?: string;
}

export class StrategyDto {
    @ApiProperty({ description: 'Strategy id', type: String })
    id!: string;
    @ApiProperty({ description: 'Strategy name', type: String })
    name!: string;
    @ApiProperty({ description: 'Strategy source code', type: String })
    code!: string;
    @ApiProperty({ description: 'Inferred problem type id for this strategy', type: String })
    problemTypeId!: string;
}

function toStrategyDto(strategy: MetaSolverStrategy): StrategyDto {
    return {
        id: strategy.id,
        name: strategy.name,
        code: strategy.code,
        problemTypeId: strategy.problemTypeId,
    };
}

@ApiTags('strategies')
@Controller('strategies')
export class StrategyController {
    private static readonly strategies = new Map<string, MetaSolverStrategy>();

    @Post()
    @ApiOperation({ summary: 'Save a new strategy' })
    @ApiCreatedResponse({ description: 'Strategy saved', type: StrategyDto })
    @ApiBadRequestResponse({ description: 'Code is not valid' })
    @ApiBody({ type: MetaSolverStrategyInput })
    public async saveStrategy(
        @Body() body: MetaSolverStrategyInput
    ): Promise<StrategyDto> {
        const { problemTypeId, error } = await inferProblemTypeIdFromCode(body.code);
        if (!problemTypeId || error) {
            throw new HttpException('Code is not valid ' + error, HttpStatus.BAD_REQUEST);
        }
        const id = uuidv4();
        const strategy = { ...body, id, problemTypeId } as MetaSolverStrategy;
        StrategyController.strategies.set(id, strategy);
        return toStrategyDto(strategy);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an existing strategy' })
    @ApiOkResponse({ description: 'Strategy updated', type: StrategyDto })
    @ApiNotFoundResponse({ description: 'Strategy not found' })
    @ApiBadRequestResponse({ description: 'Code is not valid' })
    @ApiParam({ name: 'id', description: 'Strategy id' })
    @ApiBody({ type: UpdateStrategyInput })
    public async updateStrategy(
        @Param('id') id: string,
        @Body() body: UpdateStrategyInput
    ): Promise<StrategyDto> {
        const strategy = StrategyController.strategies.get(id);
        if (!strategy) {
            throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
        }
        if (body.code !== undefined) {
            const { problemTypeId, error } = await inferProblemTypeIdFromCode(body.code);
            if (!problemTypeId || error) {
                throw new HttpException('Code is not valid ' + error, HttpStatus.BAD_REQUEST);
            }
            strategy.problemTypeId = problemTypeId;
            strategy.code = body.code;
        }
        if (body.name !== undefined) {
            strategy.name = body.name;
        }
        StrategyController.strategies.set(id, strategy);
        return toStrategyDto(strategy);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a strategy by id' })
    @ApiOkResponse({ description: 'Strategy returned', type: StrategyDto })
    @ApiNotFoundResponse({ description: 'Strategy not found' })
    @ApiParam({ name: 'id', description: 'Strategy id' })
    public async getStrategy(@Param('id') id: string): Promise<StrategyDto> {
        const strategy = StrategyController.strategies.get(id);
        if (!strategy) {
            throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
        }
        return toStrategyDto(strategy);
    }

    @Get()
    @ApiOperation({ summary: 'List strategies, optionally filtered by problem type id' })
    @ApiOkResponse({ description: 'List of strategies returned', type: StrategyDto, isArray: true })
    @ApiQuery({ name: 'type', required: false, description: 'Filter by problemTypeId' })
    public async listStrategies(@Query('type') type?: string): Promise<StrategyDto[]> {
        const all = type
            ? Array.from(StrategyController.strategies.values()).filter(s => s.problemTypeId === type)
            : Array.from(StrategyController.strategies.values());
        return all.map(toStrategyDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a strategy' })
    @ApiOkResponse({ description: 'Strategy deleted' })
    @ApiNotFoundResponse({ description: 'Strategy not found' })
    @ApiParam({ name: 'id', description: 'Strategy id' })
    public async deleteStrategy(@Param('id') id: string): Promise<{ success: boolean }> {
        const existed = StrategyController.strategies.delete(id);
        if (!existed) {
            throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
        }
        return { success: true };
    }

    @Post(':strategyId/execute')
    @ApiOperation({ summary: 'Execute a strategy against a problem' })
    @ApiOkResponse({ description: 'Execution result returned' })
    @ApiNotFoundResponse({ description: 'Strategy not found' })
    @ApiBadRequestResponse({ description: 'Missing problemId or invalid request' })
    @ApiParam({ name: 'strategyId', description: 'Strategy id' })
    @ApiBody({ type: ExecuteStrategyInput })
    public async executeStrategy(
        @Param('strategyId') strategyId: string,
        @Body() body: ExecuteStrategyInput
    ): Promise<{ result: any }> {
        const strategy = StrategyController.strategies.get(strategyId);
        if (!strategy) {
            throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
        }
        if (!body.problemId) {
            throw new HttpException('Missing problemId', HttpStatus.BAD_REQUEST);
        }
        const result = await solve(strategy, body.problemId);
        return { result };
    }
}
