# Spec: Data Model & Calendar Logic

Para resolver la UI del calendario de manera eficiente, el dominio separa la "Rutina" en dos entidades distintas:

## 1. `RoutineTemplate` (El Futuro / El Plan)
Es la "plantilla" de la rutina. 
- Contiene los ejercicios planeados, las series objetivo, las repeticiones objetivo y el último peso conocido.
- **Uso:** Si el usuario navega a un día futuro o al día de hoy en el calendario, el sistema lee de aquí.
- **Mutación:** Solo se actualiza como resultado de una evaluación de Sobrecarga Progresiva exitosa.

## 2. `WorkoutLog` (El Pasado / La Realidad)
Es el registro inmutable de la sesión.
- Contiene la fecha exacta, los ejercicios, el peso exacto levantado y las repeticiones exactas logradas por serie.
- **Uso:** Si el usuario navega a un día pasado en el calendario, ve esta entidad. No afecta la plantilla actual.