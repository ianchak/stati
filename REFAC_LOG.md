# Stati Refactoring Log

This file tracks refactoring operations applied to the Stati codebase for maintainability and code quality improvements.

## REFAC-20250914-01: Extract Test Mock Factory Utilities
**Date:** 2025-09-14  
**Status:** In Progress  
**Scope:** `packages/core/src/tests/` (8+ test files)  
**Rationale:** Eliminate massive duplication of mock setup patterns across test files  
**Files Touched:** TBD  
**Commits:** TBD  

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