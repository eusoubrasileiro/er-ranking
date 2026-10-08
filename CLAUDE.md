# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Royal Ambassadors Ranking (Embaixadores do Rei) - A leaderboard application for tracking participant points in a youth program. The application displays a ranking with a podium for top 3 participants, a searchable leaderboard table, and a Bible verses memorization tracking page.

**Stack**: Vite + React + TypeScript + shadcn/ui + Tailwind CSS + TanStack Query + React Router

## Commands

### Development
```bash
npm run dev          # Start dev server on http://[::]:8080
npm run build        # Production build (fetches verses + builds)
npm run build:dev    # Development build (fetches verses + builds)
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run fetch-verses # Manually fetch Bible verses from YouVersion API
```

### Development Server
- Default port: 8080
- Host: `::` (IPv6 compatible)
- Base path: `/er-ranking/`

## Architecture

### Data Flow

#### Leaderboard Data
1. **Data Source**: Static JSON file at `public/data/leaderboard.json` containing season info, rules, and participant data
2. **Data Hook**: `useLeaderboardData` hook fetches and processes the JSON, sorting participants by points (descending) then alphabetically
3. **Pages**: Index page and Versiculos page both use this data
4. **Components**: Modular components (Header, Hero, RulesSection, Podium, Leaderboard, Footer) receive processed data as props

#### Verses Data
1. **Data Source**: Generated JSON file at `public/data/verses.json` (created by `npm run fetch-verses`)
2. **Data Hook**: `useVersesData` hook uses TanStack Query to fetch verses with 1-hour cache
3. **Page**: Versiculos page displays memorized verses with word counts and points calculation

### Component Structure
- `src/pages/` - Page components
  - `Index.tsx` - Main leaderboard page with data loading orchestration
  - `Versiculos.tsx` - Bible verses memorization page with search, view modes, and version toggle
  - `NotFound.tsx` - 404 error page
- `src/components/` - Feature components
  - `Header.tsx` - Fixed navigation bar with links to Ranking and Versiculos
  - `Hero.tsx` - Hero section with insignia, season info, and participant count
  - `Podium.tsx` - Top 3 participants podium display
  - `Leaderboard.tsx` - Full participant ranking table with search
  - `RulesSection.tsx` - Scoring rules display with dynamic icons
  - `Footer.tsx` - Footer with branding
  - `NavLink.tsx` - React Router NavLink wrapper with active state styling
- `src/components/ui/` - shadcn/ui components (pre-built, avoid editing directly)
  - `accordion.tsx`, `button.tsx`, `input.tsx`, `toast.tsx`, `tooltip.tsx`, etc.
- `src/hooks/` - Custom React hooks
  - `useLeaderboardData.ts` - Fetches and sorts leaderboard data
  - `useVersesData.ts` - TanStack Query hook for verses data with caching
  - `use-mobile.tsx` - Mobile breakpoint detection (768px)
  - `use-toast.ts` - Toast notification state management
- `src/lib/utils.ts` - Utility functions (currently only `cn` for className merging)

### State Management
- TanStack Query (`QueryClient`) configured in `App.tsx` for verses data caching
- Local state in components (useState)
- LocalStorage for user preferences: `bibleVersion` (persisted Bible version selection)
- No global state management library (Redux/Zustand) currently used

### Routing
- React Router DOM v6 configured in `App.tsx`
- BrowserRouter with basename: `/er-ranking/`
- Current routes:
  - `/` - Main leaderboard (Index page)
  - `/versiculos` - Bible verses memorization page (Versiculos page)
  - `*` - 404 Not Found page
- **Important**: Add custom routes ABOVE the catch-all `*` route in `App.tsx`

### Styling System
The application uses a custom "Royal Theme" design system with:
- **Primary colors**: Royal blue (`--primary: 220 82% 24%`) and gold (`--accent: 45 70% 52%`)
- **Fonts**: Inter (sans) and Cinzel (display/serif) from Google Fonts
- **Custom utilities**: `.card-royal`, `.card-gold`, `.royal-gradient`, `.gold-gradient`, `.hero-gradient`
- **Custom animations**: `fade-in`, `scale-in`, `float`, `shine`, `fade-up` keyframes available
- **Animation delays**: `.animation-delay-100`, `.animation-delay-200`, `.animation-delay-300`
- **Medals**: `.medal-badge`, `.medal-gold`, `.medal-silver`, `.medal-bronze`
- Color tokens use HSL format via CSS variables (e.g., `hsl(var(--primary))`)

### TypeScript Configuration
- Path alias: `@/*` maps to `./src/*`
- Relaxed settings: `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedParameters: false`
- Two config files: `tsconfig.app.json` (app) and `tsconfig.node.json` (build tools)

## Data Schemas

### Leaderboard Data (`public/data/leaderboard.json`)
```typescript
{
  season: string;           // e.g., "2026"
  updatedAt: string;        // ISO date string
  rules: Array<{
    id: number;
    description: string;
    points: number;
    icon?: string;          // Optional lucide-react icon name (e.g., "Church", "Crown")
    explanation?: string;   // Optional tooltip explanation for rule
  }>;
  participants: Array<{
    id: number;
    name: string;
    points: number;
    memorizedVerses?: VerseRecord[];  // See VerseRecord format below
  }>;
}

// VerseRecord can be a plain string (legacy) or an object:
type VerseRecord = string | {
  ref: string;            // Verse reference (e.g., "Jo 3:16")
  version?: string;       // Version the boy recited: NVI, ARA, NAA, ARC, Manual... (points use THIS text)
  versionPending?: boolean; // true = version not confirmed yet (site shows "NVI?")
  addedAt?: string;       // ISO timestamp — REQUIRED for new verses (delta calculation depends on it)
  suspended?: boolean;    // true = verse temporarily removed from scoring
  suspendedAt?: string;   // ISO timestamp of when it was suspended
};
```

**IMPORTANT — Adding verses to leaderboard.json:**
- **New verses MUST always use the object format with `addedAt`**. Without `addedAt`, the verse won't appear in delta arrows (up arrows on the ranking). Plain strings are only acceptable for legacy verses that predate the tracking system.
- To **suspend** a verse (boy couldn't recite it), add `"suspended": true` and `"suspendedAt"`. Points are deducted, but the verse stays in the list for later restoration.
- To **restore** a suspended verse, remove `"suspended"` and `"suspendedAt"` (or set `"suspended": false`).

Participants also carry `visitors` (`{ name, addedAt }`), `attendance` (`{ date, type, addedAt }`),
`exams` (`{ lesson, grade, date, addedAt }` — a retake is just another record, best grade counts) and
`lessonItems` (`{ lesson, item, date, addedAt }`, item ids from `lessons.json`).

```
// NEW verse (correct):
{ "ref": "Jo 3:16", "version": "ARA", "addedAt": "2026-02-18T12:00:00.000Z" }

// NEW verse (WRONG — delta arrows won't work):
"Jo 3:16"

// Suspended verse:
{ "ref": "Jo 3:16", "addedAt": "...", "suspended": true, "suspendedAt": "2026-02-18T12:00:00.000Z" }
```
```

### Verses Data (`public/data/verses.json`)
**Generated automatically by `npm run fetch-verses`**

```typescript
{
  generatedAt: string;      // ISO timestamp of when verses were fetched
  defaultVersion: string;   // Default Bible version abbreviation (e.g., "NVI")
  versions: {
    [abbreviation: string]: {
      id: number;           // YouVersion Bible ID (e.g., 129 for NVI)
      name: string;         // Display name (e.g., "Nova Versão Internacional")
      fullTitle: string;    // Full title
    }
  };
  verses: {
    [reference: string]: {  // Portuguese reference (e.g., "Jo 3:16")
      [version: string]: {  // Version abbreviation (e.g., "NVI")
        reference: string;  // Formatted reference (e.g., "João 3:16")
        text: string;       // Plain text verse content
        wordCount: number;  // Word count for points calculation
        youversionUrl: string;  // Link to verse on YouVersion
      }
    }
  }
}
```

## Bible Verses System

### Fetching Verses
The project includes a script to fetch Bible verses from the YouVersion API:

**Script**: `scripts/fetch-verses.js`
- Uses `@youversion/platform-core` SDK to fetch verses
- Reads `memorizedVerses` from `leaderboard.json`
- Parses Portuguese Bible references (e.g., "Jo 3:16") to USFM format (e.g., "JHN.3.16")
- Fetches multiple Bible versions configured in `scripts/bible-versions.json`
- Calculates word counts for points determination
- Outputs to `public/data/verses.json`

**Configuration**: `scripts/bible-versions.json`
```json
{
  "defaultVersion": "NVI",
  "versions": [
    { "id": 129, "abbreviation": "NVI", "name": "Nova Versão Internacional" },
    { "id": 3254, "abbreviation": "BLT", "name": "Bíblia Livre Para Todos" }
  ]
}
```

**Portuguese to USFM Book Mapping**:
- Supports all 66 Bible books
- Examples: "Jo" → "JHN", "Sl" → "PSA", "1Co" → "1CO"
- Reference formats: "Jo 3:16" (single verse), "1Co 13:4-8" (verse range)

### Points Calculation
All scoring lives in `src/lib/calculatePoints.ts` (`calculateParticipantPoints`, `scoreVerseRecord`).
Verses are scored verse by verse (ranges expanded), by word count **of the version the boy recited**:
- **< 20 words**: 25 points, **≥ 20 words**: 35 points
- Required verse of a Manual lesson: × `multipliers.lesson` (2); challenge verse: × `multipliers.challenge` (3)
- If the recited version's text is missing, the default version's word count is used

The viewer's version toggle never changes points. The delta (up arrow) is `total(now) − total(records before pointsAsOf)`.

### Manual do Candidato (`lessons.json`)
`configs/royal-ambassadors/data/lessons.json` defines each lesson: required `verses`, optional `challenge`
verses (each `{ ref, version }` with the notebook version), `items` (`{ id, label, points }`) and `exam`.
Shared values: `multipliers` and `exam` (`pointsPerGrade` 5, `maxGrade` 10, `passGrade` 7, `retakes` 1).
Each lesson also has `short` (station label); top-level `graduation` (`{ label, date: "YYYY-MM" }`) is the summit.

**A Escalada** (`ClimbMountain.tsx`, compact on Ranking via `ClimbSection.tsx`, full on `/manual`): SVG mountain,
one station per lesson. A boy's position = Σ over lessons of done parts ÷ parts, where parts = required verses +
items + exam passed (grade ≥ 7); the challenge verse earns points but not progress. Logic lives in
`src/lib/manualProgress.ts` (also used by the `/manual` grid).

### Hand-entered verse texts (`verse-texts.json`)
The YouVersion key only serves NVI/NBV/BLT/ptNVI/O Livro. Texts for ARC, ARA, NAA and the printed Manual go in
`configs/royal-ambassadors/data/verse-texts.json`, copied **exactly** from bible.com (ARC 212, ARA 1608, NAA 1840;
bible.com blocks curl — use a browser). `fetch-verses.js` merges them into `verses.json` with word counts.

### Versiculos Page Features
- **Search**: Filter participants by name
- **View Modes**:
  - **Compact**: Shows verse references as clickable pills with points (e.g., "Jo 3:16 +35")
  - **Expanded**: Accordion view with full verse text, word count, and points
  - **All Verses**: Shows all unique verses memorized across all participants
- **Per-boy views**: each verse shows the boy's version badge (dashed "NVI?" = pending) and lesson badge ("T2 ×2")
- **Version Toggle**: only in "Todos Versículos", for reading; does not affect points

## Environment Variables

Create a `.env` file in the root directory (gitignored):

```bash
YOUVERSION_API_KEY=your_api_key_here
```

**Required for**:
- Running `npm run fetch-verses`
- Running `npm run build` or `npm run build:dev` (both run fetch-verses first)

**Obtaining an API key**:
1. Visit https://developers.youversion.com/
2. Sign up for developer access
3. Create an application to receive an API key

## Deployment

### GitHub Actions
The project deploys automatically to GitHub Pages via `.github/workflows/deploy.yml`:

**Trigger**:
- Push to `main` branch
- Manual workflow dispatch

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Create `.env` file with `YOUVERSION_API_KEY` from GitHub secret
4. Install dependencies
5. Run `npm run build` (fetches verses + builds production bundle)
6. Deploy to GitHub Pages

**Required GitHub Secret**:
- `YOUVERSION_API_KEY` - Set in repository Settings → Secrets and variables → Actions

**Deployment URL**: `https://[username].github.io/er-ranking/`

## Development Notes

### Adding/Modifying Components
- Use shadcn/ui components from `src/components/ui/` when possible
- Import the `cn` utility from `@/lib/utils` for conditional className merging
- Follow the royal theme color scheme (royal blue + gold)
- Component props should include TypeScript interfaces

### Updating Leaderboard Data
**Source of truth is `configs/royal-ambassadors/data/`** — `npm run setup-config` (run by `dev`/`build`) copies it over
`public/data/`. Edit the configs file, then run `npm run setup-config`. Data entry is done by Claude from Andre's notes
(WhatsApp "Tasks" group or chat); there is no admin panel. Previous seasons are preserved as git tags (e.g. `gincana-2026-1`).

Ranking sort (in `useLeaderboardData.ts`):
- Primary sort: Points (descending)
- Secondary sort: Name (alphabetical, locale-aware)

### Adding Memorized Verses
1. Add new verses using the **object format with `version` and `addedAt`** (NEVER as plain strings):
   ```json
   { "ref": "Jo 3:16", "version": "ARA", "addedAt": "2026-02-18T12:00:00.000Z" }
   ```
   If the version is not ARC/ARA/NAA text already in `verse-texts.json` or an API version, add the exact text there.
2. To suspend a verse the boy couldn't recite:
   ```json
   { "ref": "Jo 3:16", "addedAt": "...", "suspended": true, "suspendedAt": "2026-02-18T12:00:00.000Z" }
   ```
3. Run `npm run fetch-verses` to fetch verse text from YouVersion API
4. Verses will appear on the `/versiculos` page with automatic points calculation
5. Edit `configs/royal-ambassadors/data/leaderboard.json` and run `npm run setup-config` to sync `public/data/`

### Adding Icons to Rules
Rules can display custom icons from lucide-react. To add a new icon to a rule:

1. **Add icon to JSON data** (`public/data/leaderboard.json`):
   ```json
   { "id": 5, "description": "Pre-requisitos", "points": 50, "icon": "BadgeCheck" }
   ```

2. **Update RulesSection component** (`src/components/RulesSection.tsx`):
   - Import the icon: `import { ..., BadgeCheck } from 'lucide-react';`
   - Add to iconMap: `BadgeCheck,`

**Available icons**: Browse at https://lucide.dev/icons

**Current icons in use**:
- `Church` - Worship attendance
- `Crown` - Embassy participation
- `UserPlus` - Bringing visitors
- `BookOpen` - Scripture memorization
- `BadgeCheck` - Prerequisites
- `Plus` - Default fallback

### Adding New Routes
Insert routes in `src/App.tsx` BEFORE the `<Route path="*" element={<NotFound />} />` catch-all.

### Styling Guidelines
- Use Tailwind utility classes
- Custom royal theme classes: `.card-royal`, `.card-gold`, `.royal-gradient`, `.gold-gradient`
- Animations: `animate-fade-in`, `animate-scale-in`, `animate-float`, `animate-shine`
- Access theme colors via Tailwind (e.g., `bg-primary`, `text-accent`)
- Gold shadows available: `shadow-gold`, `shadow-card`, `shadow-elevated`

## Data Entry

No admin panel. Claude edits the JSON in `configs/royal-ambassadors/data/` from Andre's notes.

### Verse Reference Format
Use Portuguese abbreviations: `Jo` (John), `Sl` (Psalms), `1Co` (1 Corinthians), etc.
- Examples: `Jo 3:16`, `Sl 23:1-6`, `1Co 13:4-8`, `Gn 1:1`

## Troubleshooting

### Verses Not Fetching
- Ensure `.env` file exists with valid `YOUVERSION_API_KEY`
- Check API key permissions at https://developers.youversion.com/
- Some verses may return 404 for certain Bible versions (BLT doesn't have all Psalms)

### Build Failures
- Build automatically runs `fetch-verses` first - ensure API key is set
- For GitHub Actions, ensure `YOUVERSION_API_KEY` secret is configured in repository settings

### LocalStorage Issues
- Bible version preference stored in `bibleVersion` key
- Clear browser localStorage if experiencing version selection issues
