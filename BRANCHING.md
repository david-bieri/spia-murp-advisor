# Branching Strategy

This document captures how to think about `main` vs `develop` for this project.
It is worth reading before making any commit decision.

---

## The core mental model

`main` is not a folder where finished files live. It is a standing commitment to
anyone relying on the deployed URL: **everything here works, right now, as expected.**
Every commit to `main` must leave that promise intact.

`develop` is where you are allowed to be wrong. You can push broken code,
half-finished features, and exploratory changes. Nobody is relying on it. The Vercel
preview URL for `develop` is yours alone.

The branch strategy exists to protect the promise — not to separate files by
completion status.

---

## Why "almost all files go to main" is not a contradiction

New developers often assume: *if the feature is not done, the files should not be on
main.* This conflates two different things — **code existing** and **code being active**.

Files fall into three categories when assessing branch safety:

**Documentation** — README.md, CLAUDE.md, PROGRESS.md, DECISIONS.md. These have
no effect on runtime behaviour. Commit them to main immediately whenever they are
updated.

**Additive content** — KB files in `src/content/`. The current `knowledge.ts` reads
all `.md` files in that directory automatically. New KB files land on main and improve
Jane's answers immediately, with no risk of breaking existing behaviour.

**Inert code** — new components and hooks that nothing currently imports. These files
exist in the codebase, TypeScript compiles them, Vercel bundles them, but no user ever
sees them. This is called **dark launching**: you ship the infrastructure before you
ship the activation. It is standard practice. The components sit dormant until the
files that call them are in place.

The files that must stay on `develop` until tested are the ones that **replace
something currently working**. For Jane, these are `knowledge.ts` (changes how context
is assembled) and `route.ts` (changes the API behaviour). If either has a bug, Jane
stops responding entirely. Everything else is preparation for the moment those two
files merge.

---

## The theatre analogy

A theatre installing a new lighting system while performances continue nightly. The
crew can run new cables (KB files), mount new fixtures (components), install the
control board software (hooks) — all while the old system keeps running. The risk is
concentrated in one moment: connecting the new board to the mains power (`route.ts`)
and reconfiguring the control software (`knowledge.ts`). Until that moment, all the
installation work is safe to do in plain sight.

---

## Rules for this project

**Commit to `main` directly when:**
- The change is documentation only
- The change adds new content files to `src/content/`
- The change adds a new file that nothing currently imports (inert code)
- The change appends to an existing file without modifying existing lines
  (e.g. adding chips to `StarterPrompts.tsx`, appending to `globals.css`)

**Commit to `develop` first when:**
- The change replaces a file that is currently working in production
- The change modifies `route.ts` or `knowledge.ts` in any way
- The change alters how existing components render
- You are not certain what breaks if there is a bug

**The question to ask before every commit:**
> If this change has a bug, what breaks?

If the answer is *nothing currently working* → main is fine.
If the answer is *Jane stops responding* or *the page crashes* → develop first.

---

## Merge checklist — when develop is ready for main

Do not merge until you can answer yes to all of these:

- [ ] `npx playwright test` passes on the develop branch
- [ ] The feature has been tested end-to-end on the Vercel preview URL
- [ ] Tested on mobile (iOS Safari) and desktop
- [ ] Cold-start response time measured and acceptable (<8s for degree map)
- [ ] At least one round of colleague feedback on the stable `main` features
- [ ] `git diff develop main` contains nothing you cannot explain

---

## Commit message convention (for context)

Per CLAUDE.md, prefix every commit:

| Prefix | Use for |
|---|---|
| `feat:` | New capability visible to users |
| `fix:` | Bug fix |
| `docs:` | README, DECISIONS, PROGRESS, CLAUDE.md, this file |
| `content:` | KB files in `src/content/` |
| `ui:` | Component or styling changes |
| `chore:` | Config, dependencies, .gitignore |

Commits to `main` should each represent a complete, coherent unit of work. Commits
to `develop` can be messier — that is what the branch is for. When merging develop
into main, squash or tidy commit messages so the main history stays readable.

---

## Git commands — day-to-day branch work

### Check where you are

```powershell
git branch          # lists all local branches, asterisk marks the active one
git status          # shows active branch at the top, plus any uncommitted changes
```

Always run one of these before committing — it is easy to commit to the wrong branch.

### Create the develop branch (one-time setup)

```powershell
git checkout -b develop          # create develop from current state of main
git push -u origin develop       # push to GitHub and set upstream tracking
```

After this, Vercel automatically generates a preview URL for every push to `develop`.

### Switch between branches

```powershell
git checkout main                # switch to main
git checkout develop             # switch to develop
```

Your working directory files update immediately to reflect the active branch.
Uncommitted changes travel with you — commit or stash them first if they belong
to the branch you are leaving.

### Stash uncommitted work before switching

```powershell
git stash                        # temporarily shelve uncommitted changes
git checkout main                # switch branch
git checkout develop             # switch back
git stash pop                    # restore the shelved changes
```

### Commit and push to the active branch

```powershell
git add .
git commit -m "content: add murp_deadlines.md"
git push                         # pushes to whichever branch is active
```

`git push` always goes to the upstream of the active branch — `origin/main` when
on main, `origin/develop` when on develop. Verify with `git status` first.

### Keep develop up to date with main

If you add commits to main (e.g. a KB file or doc fix) while develop is active,
bring those changes into develop:

```powershell
git checkout develop
git merge main                   # pull main's new commits into develop
git push
```

Do this regularly to prevent the branches drifting too far apart.

### Merge develop into main when ready

```powershell
git checkout main
git merge develop
git push                         # triggers Vercel production redeploy
```

After merging, develop still exists and can continue receiving commits.
You do not need to delete or recreate it.

### Check what differs between branches before merging

```powershell
git diff main develop            # shows every line difference
git log main..develop --oneline  # shows commits on develop not yet on main
```

Run `git log main..develop --oneline` as a final check before every merge — it
should contain only what you expect.

---

## Broader principle

Branching discipline is not really about file organisation. It is about never breaking
the promise to the people relying on the URL. As the app grows — more programs, more
features, more colleagues testing — the cost of breaking main increases. Building the
habit now, while the project is small, is the right time.
