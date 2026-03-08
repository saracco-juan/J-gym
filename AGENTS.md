# AGENTS.md - Progressive Overload PWA

## 🎯 Visión del Proyecto
PWA mobile-first para trackear entrenamientos en el gimnasio, enfocada en la gestión de la **Sobrecarga Progresiva**. 

## 🛠️ Tech Stack Estricto
- **Frontend/Backend:** Next.js 14+ (App Router). Server Components por defecto. `"use client"` solo en hojas del árbol (interactividad).
- **Lenguaje:** TypeScript estricto. `any` está prohibido.
- **Estilos:** TailwindCSS.
- **Base de Datos & Auth:** Supabase.
- **Estado Local:** Zustand (exclusivo para la sesión de entrenamiento activa).

## 🛑 Reglas Inquebrantables (Core Guardrails)
1. **PESO MANUAL SIEMPRE:** La app gestiona la progresión de *series y repeticiones* matemáticamente. El incremento de PESO (kilos/libras) es ESTRICTAMENTE MANUAL. **NUNCA** escribas un algoritmo que sume o sugiera kilos automáticamente.
2. **Clean Architecture Light:** React es solo UI. Toda la lógica de sobrecarga progresiva debe ser pura, estar en `src/core/` y no depender de React ni del navegador.
3. **No God Objects:** Si un componente de React supera las 200 líneas, debes sugerir dividirlo.
4. **Patrón Repositorio:** La UI no toca Supabase directamente. Usa repositorios en `src/infrastructure/`.

## 📚 Habilidades y Contexto a Demanda (Skills)
*Agente: NO asumas la estructura ni la lógica de negocio. Si necesitas realizar una de estas tareas, pídeme que te inyecte el archivo correspondiente:*
- Para reglas de Arquitectura y Estructura de Carpetas: `/docs/architecture.md`
- Para programar el algoritmo de Sobrecarga Progresiva: `/docs/specs/overload-rules.md`
- Para modelar o consultar la Base de Datos: `/docs/specs/data-model.md`