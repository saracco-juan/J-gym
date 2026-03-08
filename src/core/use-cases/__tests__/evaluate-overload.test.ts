import { evaluateOverload } from "../evaluate-overload";
import type {
    IOverloadStrategy,
    IPlannedExerciseData,
    IActualExerciseData,
    IOverloadSuggestion,
} from "../../strategies/overload-strategy.interface";

describe("evaluateOverload (use case)", () => {
    it("debe delegar la evaluación a la estrategia inyectada", () => {
        const mockSuggestion: IOverloadSuggestion = {
            type: "progress",
            nextSets: [
                { setNumber: 1, targetReps: 10, targetWeight: 50 },
            ],
            message: "Mock suggestion",
        };

        const mockStrategy: IOverloadStrategy = {
            evaluate: jest.fn().mockReturnValue(mockSuggestion),
        };

        const planned: IPlannedExerciseData = {
            sets: [{ setNumber: 1, targetReps: 12, targetWeight: 40 }],
        };

        const actual: IActualExerciseData = {
            sets: [{ setNumber: 1, actualReps: 12, actualWeight: 40 }],
        };

        const result = evaluateOverload(mockStrategy, planned, actual);

        expect(mockStrategy.evaluate).toHaveBeenCalledWith(planned, actual);
        expect(result).toEqual(mockSuggestion);
    });

    it("debe retornar la sugerencia de la estrategia sin modificarla", () => {
        const mockSuggestion: IOverloadSuggestion = {
            type: "maintain",
            nextSets: [
                { setNumber: 1, targetReps: 8, targetWeight: 60 },
                { setNumber: 2, targetReps: 8, targetWeight: 60 },
            ],
            message: "Mantener esquema",
        };

        const mockStrategy: IOverloadStrategy = {
            evaluate: jest.fn().mockReturnValue(mockSuggestion),
        };

        const planned: IPlannedExerciseData = { sets: [] };
        const actual: IActualExerciseData = { sets: [] };

        const result = evaluateOverload(mockStrategy, planned, actual);

        expect(result).toBe(mockSuggestion); // Misma referencia, no copia
    });
});
