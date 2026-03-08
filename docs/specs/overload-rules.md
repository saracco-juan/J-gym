# Spec: Progressive Overload Engine

Esta es la lógica de negocio core que reside en `src/core/use-cases/`.

## 1. La Regla 3x12 -> 4x8 (Standard Hypertrophy Strategy)
El algoritmo evalúa el rendimiento del usuario contra el objetivo planeado y genera una sugerencia para la próxima semana.

* **Escenario de Éxito:** Si el usuario tiene objetivo 3x12 (3 series de 12 repes) y logra completarlas con X peso, la función debe devolver un nuevo esquema: Mantener el mismo peso, pero cambiar a 4 series de 8 repeticiones (4x8).
* **Escenario de Evolución:** Si el usuario ya estaba en 4x8 y logra llegar a 4x12, el sistema sugiere aumentar el peso (preguntando cuánto) y reduce una serie (vuelve a 3x10 o 3x8, según la configuración).
* **Escenario de Fallo:** Si no alcanza las repeticiones mínimas (ej. logra 3x6 cuando debía hacer 3x8), se mantiene el esquema actual para la próxima sesión.

## 2. Testing Requerido
Cualquier modificación a este motor requiere pruebas unitarias en Jest:
1.  **Happy Path:** Alcanza el límite de reps y evoluciona el esquema.
2.  **Edge Cases:** Fuerza subida de peso, fallo muscular temprano.