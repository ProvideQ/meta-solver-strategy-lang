import { SubRoutineDefinitionDto } from "./SubRoutineDefinitionDto.ts";

export interface SubRoutineReferenceDto {
  subRoutine: SubRoutineDefinitionDto;
  subProblemIds: string[];
}
