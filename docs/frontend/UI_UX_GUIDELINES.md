# UI/UX Guidelines

> **Status:** Planned — no design system implemented.

## Design Principles (Draft)

1. **Clarity first** — renovation projects are stressful; UI should reduce cognitive load
2. **Mobile-friendly** — users may be on-site with phones
3. **Progress visible** — task completion and project status obvious at a glance
4. **Accessible** — WCAG 2.1 AA as target for core flows

## Visual Direction

**Needs Decision.** Suggested until brand provided:

- Clean, professional, trustworthy (construction/home context)
- Neutral palette with one accent color for primary actions
- Plenty of whitespace; clear typography hierarchy

## Layout Rules

- Max content width ~1200px on desktop
- Consistent page header: project name + actions
- Primary CTA per screen (one main action)

## Responsive Behavior

- Mobile-first CSS approach
- Collapsible navigation on small screens
- Touch-friendly tap targets (min 44px)

## Accessibility

- Semantic HTML
- Form labels associated with inputs
- Keyboard navigable modals and menus
- Color contrast minimum 4.5:1 for body text
- Alt text on meaningful images

## Components (Planned)

| Component | Use |
|-----------|-----|
| Button | Primary, secondary, destructive variants |
| Card | Project summary on dashboard |
| Form field | Text, email, password, textarea |
| Task list | Checkbox + title + optional due date |
| Empty state | Illustration optional; clear CTA |
| Toast / alert | Success and error feedback |
| Modal | Confirm delete, invite user |

## Loading States

- Skeleton loaders for lists
- Disabled submit button with spinner during API calls

## Error States

- Inline field errors on forms
- Page-level error banner for load failures
- Friendly copy; avoid raw stack traces

## Empty States

See `docs/planning/USER_FLOWS.md`.

## Navigation

- Authenticated: Dashboard, (Profile), Logout
- Project context: Overview, Tasks, Files (when implemented)
