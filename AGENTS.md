# Instructions for AI agents

You are helping to resolve an issue in **W34th3r**, a designed weather app (React Native, Expo, TypeScript). Read this file fully before changing anything.

## The one rule about git

**Never run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git stash` or any command that changes git history or state.** Do not stage files either.

When the work is done, **suggest a commit message** and the list of files to add, and stop. A human commits. Reading commands (`git status`, `git diff`, `git log`) are fine.

Use conventional commits:

```text
type(scope): short imperative summary

Optional body: what changed and why.
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Scopes follow the folders: `domain`, `providers`, `theme`, `ui`, `current`, `forecast`, `places`, `settings`, `details`, `data`. If the work is large, suggest several commits, each with its `git add` list.

## Before you start

1. Read the issue and restate what "done" means in one or two sentences.
2. Read the project constitution: `.specify/memory/constitution.md`. It is binding.
3. Skim the relevant spec and plan in `specs/001-weather-app/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/`).
4. Look at the surrounding code and match its style, naming and comment density.
5. If the issue is ambiguous or needs a product or design decision, ask instead of guessing.

## Environment

- Node **22.13 or newer** is required. The default Node on the maintainer's machine may be older. The maintainer uses **fish**; in bash or zsh use `export PATH=/opt/homebrew/opt/node@26/bin:$PATH`, in fish `set -gx PATH /opt/homebrew/opt/node@26/bin $PATH`.
- Install with `npm install`. Add Expo-related packages with `npx expo install <package>` so versions stay compatible.
- Real weather needs no setup (Open-Meteo). For deterministic data use `npm run start:fake`. Never commit `.env.local`, API keys or secrets, and never put a key in code, tests or logs.

## How to work

Follow the constitution's rules:

1. **Test first.** Write a failing test that captures the behaviour, see it fail for the right reason, then implement. Bug fixes start with a test that reproduces the bug.
2. **Keep it simple.** Do the smallest design that satisfies the issue. No speculative abstractions, no unrelated refactors.
3. **Keep layers apart.** `src/domain` is pure TypeScript (no React Native, no network). Only code under `src/providers` knows a provider's response shapes. Routes in `app/` are thin and re-export screens from `src/features`.
4. **Use the design tokens.** Colours, type, spacing, radii and motion come from `src/theme/tokens.ts` and `src/theme/theme-engine.ts`. Do not add hex colours or magic numbers in components.
5. **Handle failure.** Every fallible operation needs a defined, tested failure state. Show friendly messages, keep cached data with its age, never leave a blank screen.
6. **Respect privacy.** Never log coordinates, API keys or search text (use `src/lib/logger.ts`, which redacts). Coordinates leaving the device are rounded to two decimals.
7. **Accessibility.** Controls need a role, an accessible name and a 44-point target. Information is never colour-only. Decorative graphics go inside `src/ui/Decorative.tsx`. Animations must stop when the OS asks for reduced motion (`useReducedMotion`).

## Quality gates (must all pass before you say you are done)

```bash
npm run lint
npm run typecheck
npm run test:coverage
npx prettier --check .
```

- Fix lint warnings you introduce: functions stay under about 40 lines and complexity under 10.
- Coverage may not drop. Domain logic and mappers need at least 90% lines and branches.
- If you change what a screen looks like on purpose, update snapshots with `npx jest -u` and check the diff shows only the intended change.
- Update docs when behaviour changes: `README.md`, and `specs/001-weather-app/` (contracts, data model, tasks) where relevant.

## Project gotchas

- **Testing Library is async.** `render`, `renderHook`, `fireEvent` and `unmount` return promises; `await` them.
- **Test helpers.** Use `tests/helpers/render.tsx` (`renderWithProviders`, `buildTestEnvironment`) and `FakeWeatherProvider` scenarios instead of mocking modules. `expo-router` is mocked globally in `jest.setup.ts`; reach it with `jest.requireMock('expo-router').router`.
- **Do not freeze `Date.now` carelessly.** A mocked `Date.now` can stop Testing Library's wait timeouts from firing. Prefer injecting the clock.
- **Reanimated under Jest** works through the resolver set in `jest.config.js`. Animated effects are inert in snapshots when reduced motion is on.
- **Hidden elements.** Decorative layers are hidden from assistive tech, so queries need `{ includeHiddenElements: true }`.
- **Never pass React Native accessibility props to `<Svg>`.** On the web it renders a DOM `<svg>` and warns. Wrap it in `Decorative`.
- **Stale builds.** Expo inlines `EXPO_PUBLIC_*` variables and Metro caches them. After changing env variables, start with `--clear`. Persisted weather is cached per provider and for 15 minutes.
- **No device tools here.** Xcode, Maestro and a simulator may be unavailable. Do not claim a flow passes if you could not run it; say what you verified (tests, a web build) and what remains.

## When you finish

Reply with:

1. **What changed and why**, in a few sentences.
2. **How you verified it**: which commands you ran and their results, and anything you could not verify.
3. **Suggested commit message(s)** and the exact `git add` list for each. Do not run them.
4. **Follow-ups**: anything out of scope that you noticed.
