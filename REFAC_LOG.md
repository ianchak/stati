# Stati Refactoring Log

This file tracks refactoring operations applied to the Stati codebase for maintainability and code quality improvements.

## REFAC-20250914-01: Extract Test Mock Factory Utilities
**Date:** 2025-09-14  
**Status:** ✅ Completed  
**Scope:** `packages/core/src/tests/` (8+ test files)  
**Rationale:** Eliminate massive duplication of mock setup patterns across test files  
**Files Touched:** 
- `packages/core/src/tests/utils/test-mocks.ts` (new)
- `packages/core/src/tests/core/build.test.ts` (refactored)
- `packages/core/src/tests/core/error-scenarios.test.ts` (refactored)
**Commits:** 27e8c0e - refactor(tests): extract test mock utilities and standardize patterns

**Validation Checklist:**
- [x] Types ok
- [x] Lint ok  
- [x] Tests ok (364 tests pass)
- [x] Build ok

**Impact:** ~50 lines of duplication removed, standardized mock patterns across test files  

## REFAC-20250914-02: Consolidate Duplicate Template Discovery Logic  
**Date:** 2025-09-14  
**Status:** Planned  
**Scope:** `packages/core/src/core/isg/deps.ts` and `packages/core/src/core/templates.ts`  
**Rationale:** Remove duplicated business logic for template discovery  
**Files Touched:** TBD  
**Commits:** TBD  

## REFAC-20250914-03: Extract File System Path Resolution Utilities  
**Date:** 2025-09-14  
**Status:** Planned  
**Scope:** `packages/core/src/core/` (multiple files)  
**Rationale:** Centralize repeated path resolution patterns  
**Files Touched:** TBD  
**Commits:** TBD  