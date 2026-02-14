# Frontend Test Plan

> Created: 2026-02-14
> Status: DRAFT — Awaiting validation before implementation

---

## A) Test Strategy Overview

### Scope: What We Test

| Layer | In Scope | Notes |
|-------|----------|-------|
| **Store (Zustand)** | `useAppStore` actions and state | Unit tests |
| **Hooks** | `useKeyboardShortcuts`, API hooks | Unit tests |
| **Components** | `EditableCell`, `EmptyState`, `LoadingOverlay`, `StepIndicator` | Component tests |
| **Pages** | `UploadPage`, `IdentifyPage`, `ReviewPage`, `ExportPage` | Integration tests |
| **API Client** | `client.ts` functions | Unit tests with mocked axios |
| **E2E Flow** | Upload → Identify → Review → Export | Playwright (optional) |

### Scope: What We Explicitly Do NOT Test (For Now)

| Excluded | Reason |
|----------|--------|
| Backend API | Already covered by backend tests |
| Third-party libraries | React Query, Zustand internals |
| CSS/Styling | Visual regression testing not in scope |
| Browser compatibility | Not a priority for MVP |

### Test Types

| Type | Purpose | Tools | Isolation |
|------|---------|-------|-----------|
| **Unit** | Test individual functions, hooks, store | Vitest | Mocked dependencies |
| **Component** | Test UI components rendering & interaction | Vitest + React Testing Library | Mocked store/API |
| **Integration** | Test pages with mocked API | Vitest + MSW | Mock Service Worker |
| **E2E** | Full browser-based tests | Playwright (optional) | Real browser |

---

## B) Tech Stack

| Tool | Purpose | Why |
|------|---------|-----|
| **Vitest** | Test runner | Fast, Vite-native, Jest-compatible |
| **React Testing Library** | Component testing | Focus on user behavior |
| **MSW** | API mocking | Intercept network requests |
| **jsdom** | DOM environment | Lightweight browser sim |
| **Playwright** (optional) | E2E tests | Real browser testing |

---

## C) Test Structure

```
frontend/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts              # Global test setup
│   │   ├── mocks/
│   │   │   ├── handlers.ts       # MSW request handlers
│   │   │   └── server.ts         # MSW server setup
│   │   ├── unit/
│   │   │   ├── store.test.ts     # Zustand store tests
│   │   │   ├── hooks.test.ts     # Custom hooks tests
│   │   │   └── client.test.ts    # API client tests
│   │   ├── components/
│   │   │   ├── EditableCell.test.tsx
│   │   │   ├── EmptyState.test.tsx
│   │   │   ├── LoadingOverlay.test.tsx
│   │   │   └── StepIndicator.test.tsx
│   │   └── pages/
│   │       ├── UploadPage.test.tsx
│   │       ├── IdentifyPage.test.tsx
│   │       ├── ReviewPage.test.tsx
│   │       └── ExportPage.test.tsx
│   └── ...
├── vitest.config.ts
└── package.json (updated)
```

---

## D) Test Matrix

### D1) Unit Tests — Store (`useAppStore`)

| Test ID | Description | Actions Tested |
|---------|-------------|----------------|
| STORE-001 | Initial state is correct | - |
| STORE-002 | setCurrentFile updates state and step | `setCurrentFile` |
| STORE-003 | setCurrentPage resets identification | `setCurrentPage` |
| STORE-004 | toggleElement adds/removes element | `toggleElement` |
| STORE-005 | setIdentification populates selectedElements | `setIdentification` |
| STORE-006 | setExtraction updates state and step | `setExtraction` |
| STORE-007 | reset returns to initial state | `reset` |
| STORE-008 | canNavigateTo returns correct values | `canNavigateTo` |
| STORE-009 | setLoading updates loading state | `setLoading` |
| STORE-010 | State persists to sessionStorage | persist middleware |

### D2) Unit Tests — Hooks

| Test ID | Description | Hook |
|---------|-------------|------|
| HOOK-001 | useKeyboardShortcuts fires action on key press | `useKeyboardShortcuts` |
| HOOK-002 | useKeyboardShortcuts ignores input fields | `useKeyboardShortcuts` |
| HOOK-003 | useKeyboardShortcuts handles Ctrl modifier | `useKeyboardShortcuts` |
| HOOK-004 | useKeyboardShortcuts disabled option works | `useKeyboardShortcuts` |

### D3) Unit Tests — API Client

| Test ID | Description | Function |
|---------|-------------|----------|
| API-001 | uploadFile sends FormData correctly | `uploadFile` |
| API-002 | runExtraction sends correct payload | `runExtraction` |
| API-003 | updateDataset sends PUT request | `updateDataset` |
| API-004 | exportDataset returns blob | `exportDataset` |
| API-005 | getFilePreviewUrl constructs correct URL | `getFilePreviewUrl` |

### D4) Component Tests

| Test ID | Component | Description |
|---------|-----------|-------------|
| COMP-001 | EditableCell | Renders value, enters edit mode on click |
| COMP-002 | EditableCell | Saves on Enter, cancels on Escape |
| COMP-003 | EditableCell | Applies source-based styling |
| COMP-004 | EmptyState | Renders title, description, action button |
| COMP-005 | EmptyState | Action button calls onClick |
| COMP-006 | LoadingOverlay | Renders when isLoading is true |
| COMP-007 | LoadingOverlay | Hidden when isLoading is false |
| COMP-008 | LoadingOverlay | Shows progress bar when progress provided |
| COMP-009 | StepIndicator | Highlights current step |
| COMP-010 | StepIndicator | Shows checkmark for completed steps |
| COMP-011 | StepIndicator | Completed steps are clickable |
| COMP-012 | SourceFilterBar | Toggles filter on button click |

### D5) Page Integration Tests

| Test ID | Page | Description |
|---------|------|-------------|
| PAGE-001 | UploadPage | File drop triggers upload mutation |
| PAGE-002 | UploadPage | Shows error on upload failure |
| PAGE-003 | IdentifyPage | Renders image preview |
| PAGE-004 | IdentifyPage | Identify button triggers mutation |
| PAGE-005 | IdentifyPage | Element selection works |
| PAGE-006 | IdentifyPage | Extract button navigates to Review |
| PAGE-007 | ReviewPage | Renders extracted datasets |
| PAGE-008 | ReviewPage | Cell edit updates state |
| PAGE-009 | ReviewPage | Source filter filters rows |
| PAGE-010 | ReviewPage | Export button navigates to Export |
| PAGE-011 | ExportPage | Download button triggers export |
| PAGE-012 | ExportPage | Success message displays after export |

---

## E) Implementation Phases

### Phase T1: Setup (1h) ✅ COMPLETE

| Task | Details | Status |
|------|---------|--------|
| Install dependencies | vitest, @testing-library/react, @testing-library/user-event, jsdom, msw | ✅ |
| Create vitest.config.ts | Configure jsdom environment, coverage | ✅ |
| Create test setup file | Global setup, cleanup | ✅ |
| Add test scripts to package.json | `test`, `test:run`, `test:coverage` | ✅ |

**Deliverable**: `npm run test:run` runs successfully (5 tests passing) ✅

### Phase T2: Store Tests (1.5h) ✅ COMPLETE

| Task | Details | Status |
|------|---------|--------|
| Test initial state | Verify defaults | ✅ |
| Test all actions | Each action has at least 1 test | ✅ |
| Test navigation helpers | canNavigateTo logic | ✅ |
| Test persistence | sessionStorage save/restore | ✅ |

**Deliverable**: 11 store tests passing ✅

### Phase T3: Hook & API Tests (1.5h) ✅ COMPLETE

| Task | Details | Status |
|------|---------|--------|
| Test useKeyboardShortcuts | Keyboard event handling | ✅ |
| Mock axios with vi.mock | API client tests (MSW used instead) | ✅ |
| Test API functions | Request/response validation | ✅ |

**Deliverable**: 9 hook/API tests passing ✅

### Phase T4: Component Tests (2h) ✅ IN PROGRESS

| Task | Details | Status |
|------|---------|--------|
| Setup component test utilities | renderWithStore helper | ✅ |
| Test EditableCell | Edit flow, styling | ⬜ (pending) |
| Test EmptyState | Rendering, action | ✅ |
| Test LoadingOverlay | Visibility states | ✅ |
| Test StepIndicator | Navigation, styling | ✅ |

**Deliverable**: 3 component tests implemented & passing (target: 12). Additional component tests will be added in Phase T4 continuation.

### Phase T5: Page Tests (2.5h)

| Task | Details |
|------|---------|
| Setup MSW handlers | Mock all API endpoints |
| Test UploadPage | File upload flow |
| Test IdentifyPage | Identification flow |
| Test ReviewPage | Edit and filter flow |
| Test ExportPage | Export flow |

**Deliverable**: 12 page tests passing

### Phase T6: Coverage & CI (1h)

| Task | Details |
|------|---------|
| Configure coverage threshold | 70% minimum |
| Add to CI workflow | Run tests on PR |
| Document test commands | Update README |

**Deliverable**: Tests run in CI, coverage reports generated

---

## F) Coverage Goals

| Category | Target | Rationale |
|----------|--------|-----------|
| **Store** | 90% | Critical business logic |
| **Hooks** | 80% | Reusable logic |
| **Components** | 70% | UI rendering |
| **Pages** | 60% | Integration complexity |
| **Overall** | 70% | MVP baseline |

---

## G) MSW Mock Handlers (Draft)

```typescript
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy', version: '1.0.0' });
  }),

  // Upload file
  http.post('/api/files', () => {
    return HttpResponse.json({
      id: 'file-123',
      filename: 'test.png',
      mime_type: 'image/png',
      size_bytes: 1024,
      pages: null,
      created_at: new Date().toISOString(),
    });
  }),

  // Identify elements
  http.post('/api/extract/identify', () => {
    return HttpResponse.json({
      identification_id: 'id-123',
      file_id: 'file-123',
      detected_items: [
        {
          item_id: 'item-1',
          type: 'bar_chart',
          description: 'Sales by Region',
          data_preview: '4 categories, ~12 values',
          bbox: { x: 0, y: 0, width: 100, height: 100 },
          confidence: 0.95,
          warnings: [],
        },
      ],
      duration_ms: 2500,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
  }),

  // Run extraction
  http.post('/api/extract/run/:identificationId', () => {
    return HttpResponse.json({
      datasets: [
        {
          dataset_id: 'ds-123',
          source_element_id: 'item-1',
          type: 'bar_chart',
          title: 'Sales by Region',
          columns: ['Region', 'Sales', 'source'],
          rows: [
            { Region: 'North', Sales: 100, source: 'annotated' },
            { Region: 'South', Sales: 80, source: 'estimated' },
          ],
        },
      ],
      duration_ms: 5000,
    });
  }),

  // Update dataset
  http.put('/api/datasets/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // Export
  http.get('/api/export/:id', () => {
    return new HttpResponse(new Blob(['zip content']), {
      headers: { 'Content-Type': 'application/zip' },
    });
  }),
];
```

---

## H) Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm run test -- store.test.ts
```

---

## I) Success Criteria

- [ ] Vitest configured and running
- [ ] Store tests: 10 tests passing
- [ ] Hook tests: 4 tests passing
- [ ] API tests: 5 tests passing
- [ ] Component tests: 12 tests passing
- [ ] Page tests: 12 tests passing
- [ ] **Total: 43 tests minimum**
- [ ] Coverage: 70% overall
- [ ] Tests run in < 30 seconds
- [ ] No flaky tests

---

## J) Related

- Backend Test Plan: `docs/test_plan.md`
- Phase 7: UX Improvements (completed)
- Phase 8: Frontend Testing (this plan)
