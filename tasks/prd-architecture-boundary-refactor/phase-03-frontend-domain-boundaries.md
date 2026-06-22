# Phase 3: Frontend Domain Boundaries

## Objective
Remove avoidable frontend dependency-rule violations where domain modules import persistence or page-layer types.

## Phase Discovery Gate
- [ ] Re-check `webapp/src/domain/session.ts`, `webapp/src/domain/sttBackendCompatibility.ts`, `webapp/src/data/app-db.ts`, and affected tests.
- [ ] Re-check `webapp/src/components/summary/summarySurfaceModel.ts` and `webapp/src/pages/artifactBindingModel.ts`.

## Implementation Checklist
- [ ] Introduce stable domain DTOs or adapter-local mapping types for persistence records crossing into domain logic.
- [ ] Move page-owned presentation types into domain/component model modules when they are consumed outside pages.
- [ ] Keep Dexie schema changes out of scope unless a real storage requirement emerges.

## Validation Checklist
- [ ] Affected Vitest model/repository/component tests.
- [ ] `npm --prefix webapp run test`
- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run i18n:check`

## Exit Criteria
- [ ] Domain modules no longer import outer persistence/page-layer types for the targeted surfaces.
- [ ] Frontend tests remain green.
