# SlideCheck

A two-role PowerPoint validation tool. Users upload `.pptx` files and check them against formatting guidelines set by an admin. Files that pass are submitted for admin content review.

---

## Features

**User**
- Upload a `.pptx` file and validate it against a guideline set
- See a detailed pass/fail report with per-slide issues and severity levels
- All results (pass and fail) are saved to personal history
- Track submission status — pending, reviewed by admin, or failed

**Admin**
- Create and manage guideline sets (font size, font family, font color, text alignment, line spacing, header/footer presence, slide count, image count)
- Rules support scopes: apply a rule to all text, or only to title / heading / body / footer placeholders
- Review Queue shows only passing submissions — download the original file, mark as reviewed, or delete
- Search and filter the queue by file name, username, or guideline set

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | TanStack Router v1 |
| Data fetching | TanStack React Query |
| Auth state | Zustand (persist) |
| UI components | shadcn/ui + Tailwind CSS |
| PPTX parsing | JSZip + DOMParser (runs in the browser) |
| Backend | Pure Node.js HTTP server (zero npm dependencies) |
| Auth | HMAC-SHA256 tokens (7-day TTL) |
| Persistence | JSON file (`server/db.json`) |
| File storage | `server/uploads/` |

---

## Project structure

```
├── src/
│   ├── components/
│   │   ├── layout/          # AppLayout, Sidebar
│   │   ├── shared/          # ErrorBoundary, SubmissionCard, SeverityIcon
│   │   └── ui/              # shadcn/ui primitives
│   ├── lib/
│   │   ├── api.ts           # Axios client + all API calls
│   │   ├── pptxParser.ts    # Browser-side PPTX → ParsedPresentation
│   │   ├── pptxValidator.ts # Rule evaluation with scope filtering
│   │   └── utils.ts         # cn(), formatBytes(), timeAgo()
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Upload.tsx       # Validate + submit flow
│   │   ├── admin/           # TagManager, ReviewQueue
│   │   └── user/            # MySubmissions
│   ├── store/
│   │   └── authStore.ts     # Zustand auth store (replaces Context)
│   ├── types/index.ts
│   └── router.tsx
├── server/
│   ├── index.js             # HTTP server — all API routes
│   ├── auth.js              # HMAC token creation + verification
│   ├── db.js                # JSON persistence + write mutex
│   ├── env.js               # Zero-dep .env loader
│   └── uploads/             # Stored PPTX files (gitignored)
├── .env.example
└── .github/workflows/ci.yml
```

---

## Getting started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### 1. Clone and install

```bash
git clone https://github.com/adham-nawito/slides-checker.git
cd slides-checker
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SECRET=your_random_32_byte_hex_string

# Login credentials
USER_PASSWORD=your_user_password
ADMIN_PASSWORD=your_admin_password

# Frontend origin (used for CORS)
CORS_ORIGIN=http://localhost:5173
```

> **Never commit `.env`** — it is gitignored.

### 3. Run locally

Open two terminals:

```bash
# Terminal 1 — API server (port 3001)
node server/index.js

# Terminal 2 — Vite dev server (port 5173)
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

**Default credentials** (from `.env.example`):

| Username | Password | Role |
|---|---|---|
| `user` | `user123` | User |
| `admin` | `admin123` | Admin |

---

## How it works

### Validation (browser-side)

1. The user selects a guideline set and uploads a `.pptx` file
2. JSZip unpacks the file in the browser; DOMParser reads each slide's XML
3. Each `<p:sp>` shape is tagged with its placeholder type (`title`, `heading`, `body`, `footer`)
4. Rules are applied per slide — text-based rules (font size, color, etc.) filter paragraphs by scope before checking
5. A pass percentage is calculated; if it meets the tag's threshold the file passes

### Submission flow

- **Pass** — the file and its report are sent to the server; the admin sees it in the Review Queue and can download the original
- **Fail** — only the report metadata is sent (no file upload); it appears in the user's personal history only and is never visible to the admin

### Auth

Tokens are HMAC-SHA256 signed JWTs stored in `localStorage` via Zustand. The server validates the signature on every protected request. A `401` response from any protected endpoint triggers an automatic logout and redirect to `/login`.

---

## API reference

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Returns a signed token |
| `GET` | `/api/tags` | Any | List guideline sets |
| `POST` | `/api/tags` | Admin | Create guideline set |
| `PUT` | `/api/tags/:id` | Admin | Update guideline set |
| `DELETE` | `/api/tags/:id` | Admin | Delete guideline set |
| `POST` | `/api/submissions` | Any | Submit validation result |
| `GET` | `/api/submissions` | Admin | List all submissions |
| `GET` | `/api/submissions/mine` | User | List own submissions |
| `GET` | `/api/submissions/:id/download` | Admin | Download stored PPTX |
| `PATCH` | `/api/submissions/:id/review` | Admin | Mark as reviewed |
| `DELETE` | `/api/submissions/:id` | Admin | Delete submission + file |

---

## CI

GitHub Actions runs on every push and pull request to `main` and `develop`:

- TypeScript type-check (`tsc --noEmit`)
- Production build (`npm run build`)

---

## Known limitations

- **Single user / single admin** — credentials are set in `.env`. Multi-user support with per-account passwords is not yet implemented.
- **`background_color` rule** — not yet supported (requires resolving theme color references from `theme.xml`). The rule type exists in the type system but is hidden from the admin UI.
- **No token refresh** — tokens expire after 7 days. Users must log in again.
- **`db.json` is the only persistence layer** — no backup strategy. Do not use in production without a proper database.
