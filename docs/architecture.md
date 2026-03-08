# Architecture Context & Folder Structure

## 1. Patrones de Diseño Requeridos
* **Strategy Pattern:** Para las reglas de sobrecarga (ej. `StandardHypertrophyStrategy`). Las interfaces viven en `src/core/strategies/`.
* **Repository Pattern:** Para llamadas a Supabase. Las clases viven en `src/infrastructure/database/`.

## 2. Estructura de Carpetas Forzada
Debes respetar esta jerarquía estrictamente al crear nuevos archivos:

src/
├── app/                  # Next.js App Router (Páginas, API Routes)
│   ├── (auth)/           # Rutas de login/registro
│   ├── dashboard/        # Calendario y Rutina del día
│   └── workout/          # Pantalla de entrenamiento en curso (Zustand state)
├── core/                 # LÓGICA DE NEGOCIO PURA (Framework Agnostic)
│   ├── domain/           # Entidades (Interfaces de TS: IWorkoutLog)
│   ├── use-cases/        # Casos de uso puros (ej. evaluateOverload.ts)
│   └── strategies/       # Algoritmos de progresión
├── infrastructure/       # ADAPTADORES (Servicios externos)
│   ├── database/         # Repositorios de Supabase
│   └── auth/             # Configuración de Supabase Auth
└── presentation/         # UI Y COMPONENTES REACT
    ├── components/       # UI Reutilizable
    └── stores/           # Zustand stores