# Phase 6 — Frontend Implementation

> Vite + React + TypeScript frontend for Infograph2Data

---

## Overview

This phase implements the web frontend that connects to the FastAPI backend, providing a complete user interface for the infographic data extraction workflow.

### User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         UPLOAD                                  │
│  User uploads PNG/JPG/PDF file                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        IDENTIFY                                 │
│  Vision LLM detects charts, tables, KPIs                        │
│  Display image with bounding boxes overlay                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CONFIRM                                  │
│  User selects/modifies/adds elements                            │
│  Choose granularity option                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        EXTRACT                                  │
│  Vision LLM extracts structured data                            │
│  Display results with timing                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        REVIEW                                   │
│  Editable data table                                            │
│  Color-coded cells (annotated vs estimated)                     │
│  Human-in-the-loop validation                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        EXPORT                                   │
│  Download CSV/JSON/ZIP with manifest                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Category | Choice | Notes |
|----------|--------|-------|
| Framework | Vite + React 18 | Fast HMR, modern tooling |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first, rapid prototyping |
| UI Components | shadcn/ui | Radix-based, accessible, customizable |
| State Management | Zustand | Simple global store, no prop drilling |
| Server State | TanStack Query (React Query) | Caching, mutations, loading states |
| Routing | React Router v6 | SPA navigation |
| Font | Inter | Clean, modern, SaaS look |

---

## Routes & Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing + Upload dropzone |
| `/files` | Files | List of uploaded files |
| `/extract/:fileId` | Extract | 3-step wizard (Identify → Confirm → Extract) |
| `/datasets` | Datasets | List of extracted datasets |
| `/datasets/:id` | DatasetDetail | Review & edit dataset |
| `/export/:id` | Export | Export options & download |

---

## Global State (Zustand)

```typescript
interface AppState {
  // Current workflow state
  currentFileId: string | null;
  currentStep: 'upload' | 'identify' | 'confirm' | 'extract' | 'review' | 'export';
  
  // Workflow options
  workflowOptions: {
    granularity: 'annotated_only' | 'full' | 'full_with_source';
    outputLanguage: string;
  };
  
  // Identification state
  identificationId: string | null;
  selectedItems: string[];  // item_ids selected for extraction
  
  // Actions
  setCurrentFile: (fileId: string) => void;
  setStep: (step: AppState['currentStep']) => void;
  setGranularity: (g: AppState['workflowOptions']['granularity']) => void;
  setIdentification: (id: string) => void;
  toggleItem: (itemId: string) => void;
  reset: () => void;
}
```

---

## Folder Structure

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/
│   │   ├── client.ts           # Axios instance with base URL
│   │   ├── types.ts            # TypeScript interfaces matching backend schemas
│   │   └── hooks/
│   │       ├── useFiles.ts     # useQuery/useMutation for /files
│   │       ├── useIdentify.ts  # useQuery/useMutation for /extract/identify
│   │       ├── useExtract.ts   # useMutation for /extract/run
│   │       └── useDatasets.ts  # useQuery/useMutation for /datasets
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, card, etc.)
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── FileUploader.tsx    # Drag & drop upload
│   │   ├── FileList.tsx        # File cards grid
│   │   ├── ImageCanvas.tsx     # Image with bbox overlay
│   │   ├── ItemCard.tsx        # Detected element card
│   │   ├── ItemEditor.tsx      # Edit title/type modal
│   │   ├── BboxDrawer.tsx      # Draw new bbox on image
│   │   ├── DataTable.tsx       # Editable data table
│   │   ├── GranularitySelect.tsx
│   │   └── ExportOptions.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Files.tsx
│   │   ├── Extract.tsx         # Wizard container
│   │   ├── Datasets.tsx
│   │   ├── DatasetDetail.tsx
│   │   └── Export.tsx
│   ├── store/
│   │   └── useAppStore.ts      # Zustand store
│   ├── lib/
│   │   └── utils.ts            # Utility functions (bbox scaling, etc.)
│   ├── App.tsx                 # Router setup
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind imports
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## Implementation Phases

### Phase F1: Setup & Infrastructure

**Duration:** 1-2 hours

| Task | Details |
|------|---------|
| Initialize Vite project | `npm create vite@latest frontend -- --template react-ts` |
| Install dependencies | tailwindcss, postcss, autoprefixer |
| Setup shadcn/ui | `npx shadcn-ui@latest init` |
| Install state libs | zustand, @tanstack/react-query |
| Install router | react-router-dom |
| Configure Vite proxy | Proxy `/api` to `localhost:8001` |
| Create folder structure | As defined above |
| Setup Zustand store | Basic `useAppStore` |
| Create API client | Axios with base config |
| Basic layout | Header + main container |
| Health check | Display backend health status |

**Deliverable:** App starts, connects to backend, displays health status

---

### Phase F2: Upload & File Management

**Duration:** 2 hours

| Task | Details |
|------|---------|
| FileUploader component | Drag & drop, file type validation |
| Upload mutation | POST /files with progress |
| Files page | Grid of uploaded files |
| File card | Thumbnail, name, size, date |
| Delete action | (Optional) Remove file |
| Navigate to extract | Button to start extraction |

**Deliverable:** User can upload files, see list, navigate to extraction

---

### Phase F3: Identification Workflow

**Duration:** 3-4 hours

| Task | Details |
|------|---------|
| Extract page | 3-step wizard UI |
| Step indicator | Visual progress (1 → 2 → 3) |
| PDF page selector | Dropdown for multi-page PDFs |
| Identify mutation | POST /extract/identify |
| Loading state | Spinner with "Analyzing..." |
| ImageCanvas component | Display image with bbox overlay |
| Bbox scaling | Calculate ratio: displaySize / actualSize |
| ItemCard component | Type icon, title, confidence badge |
| Warnings display | Yellow alert for accuracy concerns |

**Deliverable:** Vision LLM identifies elements, displayed on image with boxes

---

### Phase F4: Confirmation & Customization

**Duration:** 3 hours

| Task | Details |
|------|---------|
| Item selection | Checkbox on each ItemCard |
| Select all / none | Quick actions |
| Edit item | Modal to change title/type |
| Add new item | Draw bbox on image + set type |
| BboxDrawer component | Canvas drawing mode |
| Granularity selector | Radio group (3 options) |
| Options panel | Collapsible settings |
| Extract button | Launches extraction with selected items |

**Deliverable:** User can confirm/modify elements, choose options, start extraction

---

### Phase F5: Extraction Results & Review

**Duration:** 3 hours

| Task | Details |
|------|---------|
| Extract mutation | POST /extract/run |
| Results display | Cards per dataset with preview |
| Duration badge | Show `duration_ms` |
| DataTable component | Columns + rows display |
| Cell coloring | `source: annotated` = green, `estimated` = orange |
| Inline editing | Click cell to edit value |
| Save changes | PUT /datasets/:id |
| Validation | Visual feedback on save |

**Deliverable:** Extracted data displayed, editable with color coding

---

### Phase F6: Export

**Duration:** 1-2 hours

| Task | Details |
|------|---------|
| Export page | Dataset summary + options |
| Format selection | Checkboxes: CSV, JSON |
| Download button | GET /export/:id?formats=... |
| ZIP handling | Browser download trigger |
| Success message | Confirmation toast |

**Deliverable:** User can export dataset as ZIP

---

## Technical Considerations

### Bounding Box Scaling (F3)

The backend returns bbox coordinates based on the **actual image size**. The frontend must scale these to the **displayed size**.

```typescript
function scaleBbox(
  bbox: { x: number; y: number; width: number; height: number },
  actualSize: { width: number; height: number },
  displaySize: { width: number; height: number }
) {
  const scaleX = displaySize.width / actualSize.width;
  const scaleY = displaySize.height / actualSize.height;
  
  return {
    x: bbox.x * scaleX,
    y: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  };
}
```

### Cell Coloring (F5)

When `granularity: "full_with_source"`, rows include a `source` field:

```typescript
const cellClass = row.source === 'annotated' 
  ? 'bg-green-50 border-green-200' 
  : 'bg-orange-50 border-orange-200';
```

### API Proxy (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

---

## Design Guidelines

| Element | Specification |
|---------|---------------|
| Font | Inter (Google Fonts) |
| Primary color | Tailwind `blue-600` |
| Background | `gray-50` (light) |
| Cards | White, subtle shadow, rounded-lg |
| Buttons | shadcn/ui default variants |
| Icons | Lucide React |
| Spacing | Tailwind defaults (consistent 4px grid) |

---

## Commands

```bash
# Start frontend dev server
cd frontend && npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Success Criteria

- [ ] Complete happy path: Upload → Identify → Confirm → Extract → Review → Export
- [ ] Bounding boxes display correctly scaled on images
- [ ] Granularity options work (annotated_only, full, full_with_source)
- [ ] Cell coloring reflects source (annotated vs estimated)
- [ ] Inline editing saves changes to backend
- [ ] Export downloads ZIP file
- [ ] Responsive layout (works on desktop, tablet)
- [ ] Loading states on all async operations
- [ ] Backend health displayed in UI
