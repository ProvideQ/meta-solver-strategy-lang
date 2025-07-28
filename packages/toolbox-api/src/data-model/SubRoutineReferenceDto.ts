import { SubRoutineDefinitionDto } from "./SubRoutineDefinitionDto.js";

export interface SubRoutineReferenceDto {
  subRoutine: SubRoutineDefinitionDto;
  subProblemIds: string[];
}
