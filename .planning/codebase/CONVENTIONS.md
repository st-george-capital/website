# Coding Conventions

**Analysis Date:** 2026-04-08

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — e.g., `TradeModal.tsx`, `PortfolioChart.tsx`
- Utility/lib modules: camelCase `.ts` — e.g., `alpha-vantage.ts`, `marketing-types.ts`
- Next.js pages/routes: lowercase `page.tsx`, `route.ts`, `layout.tsx`
- Dashboard pages follow Next.js App Router conventions: `app/dashboard/[section]/page.tsx`

**Functions:**
- Exported named functions: PascalCase for React components — `export function TradeModal(...)`
- Utility/helper functions: camelCase — `formatCurrency`, `slugify`, `toNum`, `requireAuth`
- Event handlers: `handle` prefix — `handleSubmit`, `handleMouseEnter`, `handleMouseLeave`
- Data fetchers inside components: `fetch` prefix — `fetchArticles`, `fetchData`, `fetchSubmissions`
- Async API handlers: `GET`, `POST`, `PATCH`, `DELETE` (uppercase HTTP method names per Next.js route convention)

**Variables:**
- camelCase throughout — `isAdmin`, `cashBalance`, `openDropdown`
- Boolean state: `is`/`has`/`show` prefix — `isMobileMenuOpen`, `isAdmin`, `showBenchmark`
- Loading state: `loading` or specific verb — `saving`, `loading`, `takingSnapshot`
- Error state: `error` typed as `string | null`

**Types/Interfaces:**
- PascalCase with `interface` preferred for object shapes — `TradeModalProps`, `Snapshot`, `PortfolioChartProps`
- `type` used for unions/literals — `type TradeMode = 'BUY' | 'SELL' | 'IMPORT'`
- Props interfaces named `[ComponentName]Props`
- External API interfaces prefixed with service name — `AlphaVantageQuote`, `AlphaVantageNewsArticle`
- Interfaces exported from `lib/` files for cross-module use

**Constants:**
- SCREAMING_SNAKE_CASE for static lookup objects — `MODE_DESCRIPTIONS`, `EXCHANGES`

## Code Style

**Formatting:**
- No Prettier config detected — formatting is manual/editor-driven
- 2-space indentation throughout
- Single quotes for string literals in imports and most code
- Trailing commas present in multi-line objects and arrays

**Linting:**
- ESLint via `eslint-config-next` (standard Next.js ruleset)
- Run via: `npm run lint`
- No custom `.eslintrc` file — uses Next.js defaults only
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)

**TypeScript:**
- Strict mode on — no implicit `any` except where explicitly typed as `any` (e.g., `where: any` in Prisma queries)
- `any` appears as a pragmatic escape hatch, not convention — minimize new usage
- Module augmentation used in `types/next-auth.d.ts` to extend NextAuth Session/JWT types
- Path alias `@/*` maps to project root — always use `@/` for internal imports, never relative paths from `src/`

## Import Organization

**Order (observed pattern):**
1. Framework imports — `'react'`, `'next/...'`, `'next-auth/...'`
2. Third-party packages — `'lucide-react'`, `'recharts'`, `'framer-motion'`
3. Internal lib imports — `@/lib/utils`, `@/lib/auth`, `@/lib/prisma`
4. Internal component imports — `@/components/...`
5. Local/relative imports (rare)

**Path Aliases:**
- `@/*` resolves to project root — defined in `tsconfig.json`
- All internal imports use `@/` prefix, never relative paths like `../../`

## React Conventions

**Client vs Server Components:**
- `'use client'` directive required at top of files using hooks, browser APIs, or event handlers
- API routes (`app/api/**/route.ts`) are server-only — no directive needed
- Dashboard pages are almost universally `'use client'` due to session/auth hooks
- No `'use server'` actions detected — server mutations go through API routes

**Component Structure:**
- `forwardRef` used for reusable UI primitives like `Button` — `Button.displayName = 'Button'`
- Props interface defined inline above the component function
- Default prop values set in destructuring — `variant = 'primary'`, `size = 'md'`
- Named exports for all components — `export function TradeModal(...)`, not default exports
- Page components use `export default function [Name]Page()`

**State Management:**
- Local `useState` for all UI and form state — no global state library
- `useEffect` for data fetching on mount with `fetch()` calls
- `useCallback` for memoized fetch functions passed as dependencies
- `useSession` from `next-auth/react` for auth state in client components

**Styling:**
- Tailwind CSS exclusively — no CSS modules or styled-components
- `cn()` utility from `lib/utils.ts` (wraps `clsx` + `tailwind-merge`) for conditional classNames
- Dark primary color `#030116` used as brand color
- CSS custom properties (HSL variables) used for design tokens in `tailwind.config.ts`

## API Route Conventions

**Structure:**
- Each route file exports named async functions: `GET`, `POST`, `PATCH`, `DELETE`
- All routes wrapped in try/catch
- `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'` used to prevent static generation on data routes
- Auth check via `await requireAuth()` or `await requireAdmin()` at the top of protected handlers

**Response pattern:**
```typescript
return NextResponse.json(data);                          // success
return NextResponse.json(data, { status: 201 });         // created
return NextResponse.json({ error: 'message' }, { status: 500 }); // error
```

## Error Handling

**API Routes:**
- All handlers wrapped in `try { ... } catch (error) { ... }`
- `console.error('[Context] error label:', error)` on every catch
- Returns `{ error: 'human-readable message' }` with appropriate HTTP status code
- Some catches typed `catch (error: any)` to access `.message` on unknown errors
- Auth errors return status 403, server errors return 500

**Client Components:**
- `try/catch` around `fetch()` calls in event handlers
- Error state stored in `useState<string | null>` and displayed inline
- `finally` block used to reset loading state — `setSaving(false)`
- `console.error(...)` on catch for debugging

## Logging

**Framework:** `console.error` / `console.log` (native)

**Patterns:**
- API errors: `console.error('[Action description] error:', error)` — e.g., `console.error('Get holdings error:', error)`
- Non-fatal failures logged but swallowed — e.g., `console.error('Resume book sync error (non-fatal):', syncErr)`
- No structured logging library or log levels beyond `console.error`

## Comments

**When to Comment:**
- JSDoc used selectively for utility functions with non-obvious behavior — e.g., `toNum` has a block doc comment
- Inline comments explain business logic — e.g., `// Import uses the holdings API directly — no cash impact`
- Route handlers have short comments for HTTP method semantics — e.g., `// GET /api/articles - List all articles`
- Mode descriptions stored as data constants rather than comments

**TSDoc:**
- Sparse — only on `lib/utils.ts` utilities with edge case behavior

## Function Design

**Size:** Route handler functions tend to be medium-length (20–80 lines). Large DCF page (`app/dashboard/tools/dcf/page.tsx`) is an exception at 1000+ lines.

**Parameters:** Destructuring used for component props and request body parsing. Complex bodies destructured immediately after `request.json()`.

**Return Values:** Functions return `NextResponse.json(...)` consistently. Utility functions return typed primitives.

## Module Design

**Exports:**
- Named exports for components and utilities
- `export default` only for Next.js page components
- Barrel files not used — import directly from specific module paths

---

*Convention analysis: 2026-04-08*
