import { StandardHypertrophyStrategy } from "../standard-hypertrophy.strategy";
import type {
    IPlannedExerciseData,
    IActualExerciseData,
} from "../overload-strategy.interface";

describe("StandardHypertrophyStrategy", () => {
    const strategy = new StandardHypertrophyStrategy();

    // --- Helper para crear sets planeados uniformes ---
    function makePlanned(
        sets: number,
        reps: number,
        weight: number
    ): IPlannedExerciseData {
        return {
            sets: Array.from({ length: sets }, (_, i) => ({
                setNumber: i + 1,
                targetReps: reps,
                targetWeight: weight,
            })),
        };
    }

    // --- Helper para crear sets realizados uniformes ---
    function makeActual(
        sets: number,
        reps: number,
        weight: number
    ): IActualExerciseData {
        return {
            sets: Array.from({ length: sets }, (_, i) => ({
                setNumber: i + 1,
                actualReps: reps,
                actualWeight: weight,
            })),
        };
    }

    // ===================================================
    // ESCENARIO 1: ÉXITO — 3x12 completado → progresa a 4x8
    // ===================================================
    describe("Escenario de Éxito", () => {
        it("debe progresar de 3x12 a 4x8 con el mismo peso", () => {
            const planned = makePlanned(3, 12, 40);
            const actual = makeActual(3, 12, 40);

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("progress");
            expect(result.nextSets).toHaveLength(4);
            expect(result.nextSets[0].targetReps).toBe(8);
            expect(result.nextSets[0].targetWeight).toBe(40);
        });

        it("debe progresar incluso si supera las reps objetivo", () => {
            const planned = makePlanned(3, 12, 40);
            const actual = makeActual(3, 15, 40); // Hizo más de lo pedido

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("progress");
            expect(result.nextSets).toHaveLength(4);
        });
    });

    // ===================================================
    // ESCENARIO 2: EVOLUCIÓN — 4x12 completado → subir peso
    // ===================================================
    describe("Escenario de Evolución", () => {
        it("debe sugerir subir peso al completar 4x12", () => {
            const planned = makePlanned(4, 12, 40);
            const actual = makeActual(4, 12, 40);

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("increase_weight");
            expect(result.nextSets).toHaveLength(3); // Vuelve a 3 sets
            expect(result.nextSets[0].targetReps).toBe(8); // Baja a 8 reps
            expect(result.nextSets[0].targetWeight).toBe(40); // Peso base (se confirma externamente)
        });

        it("debe sugerir subir peso si supera 4x12", () => {
            const planned = makePlanned(4, 12, 40);
            const actual = makeActual(4, 14, 40);

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("increase_weight");
            expect(result.nextSets).toHaveLength(3);
        });
    });

    // ===================================================
    // ESCENARIO 3: FALLO — no alcanza reps → mantener
    // ===================================================
    describe("Escenario de Fallo", () => {
        it("debe mantener esquema si no alcanza reps mínimas (3x6 en vez de 3x12)", () => {
            const planned = makePlanned(3, 12, 40);
            const actual = makeActual(3, 6, 40);

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("maintain");
            expect(result.nextSets).toHaveLength(3);
            expect(result.nextSets[0].targetReps).toBe(12);
            expect(result.nextSets[0].targetWeight).toBe(40);
        });

        it("debe mantener si falla una sola serie", () => {
            const planned = makePlanned(3, 12, 40);
            // 2 series bien, 1 serie falla
            const actual: IActualExerciseData = {
                sets: [
                    { setNumber: 1, actualReps: 12, actualWeight: 40 },
                    { setNumber: 2, actualReps: 12, actualWeight: 40 },
                    { setNumber: 3, actualReps: 8, actualWeight: 40 },
                ],
            };

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("maintain");
            expect(result.nextSets).toHaveLength(3);
        });

        it("debe mantener si hace menos series de las planeadas", () => {
            const planned = makePlanned(3, 12, 40);
            const actual = makeActual(2, 12, 40); // Solo 2 de 3 series

            const result = strategy.evaluate(planned, actual);

            expect(result.type).toBe("maintain");
        });
    });

    // ===================================================
    // EDGE CASE: 4x8 completado → progresa a 4x8 (ya en max sets)
    // ===================================================
    describe("Edge Cases", () => {
        it("debe mantener 4x8 si alcanza 4x8 pero no 4x12", () => {
            const planned = makePlanned(4, 8, 40);
            const actual = makeActual(4, 8, 40);

            const result = strategy.evaluate(planned, actual);

            // 4 sets pero reps < 12, sigue progresando internamente
            // Como ya tiene maxSets pero no alcanzó targetRepsHigh, es "progress"
            // pero no puede agregar más sets → se mantiene en 4x8
            expect(result.type).toBe("progress");
            expect(result.nextSets).toHaveLength(4);
            expect(result.nextSets[0].targetReps).toBe(8);
        });
    });
});
