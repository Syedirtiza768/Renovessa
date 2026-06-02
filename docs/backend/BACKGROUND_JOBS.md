# Background Jobs

> **Status:** Planned — none implemented. Not required for MVP.

## Future Jobs

| Job | Trigger | Purpose | Phase |
|-----|---------|---------|-------|
| `sendInviteEmail` | User invites collaborator | Deliver invite link | 2–3 |
| `sendTaskReminder` | Scheduled cron | Due date reminders | Later |
| `generateThumbnail` | File uploaded | Image preview | Later |
| `cleanupExpiredInvites` | Daily cron | Remove stale tokens | 2–3 |

## Queue (Planned)

**Needs Decision** when jobs are introduced:

- BullMQ + Redis
- Inngest / Trigger.dev
- Framework-native cron (simple cases only)

## Implementation Status

No queue, workers, or schedulers exist.
