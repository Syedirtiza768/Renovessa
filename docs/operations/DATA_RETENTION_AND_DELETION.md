# Data Retention and Deletion Procedure

**Owner:** Privacy lead

**Version:** 2026-07-23-v1

**Review cadence:** Quarterly and after a material product or legal change

## Retention schedule

| Record | Default period | Trigger | Disposal |
|---|---:|---|---|
| Local, unsubmitted wizard draft | 24 hours | Last browser update | Browser storage expiry/removal |
| RFQ, bid, appointment, account and contractor record | 7 years | Last material activity | Hard delete or irreversible de-identification after exception review |
| Email/call delivery and operational message logs | 3 years | Message date | Delete content and provider identifiers; retain minimal aggregate data |
| Security and application logs | 1 year | Event date | Automated expiry |
| Consent/clickwrap evidence | 7 years after relationship/claim ends | Last related activity | Delete after legal-hold review |
| Communication suppression | Duration of suppression plus 7 years | Revocation/last challenge | Retain the minimum normalized destination and evidence needed to honor/prove opt-out |
| Incident evidence | 7 years after closure | Incident closure | Secure destruction after counsel/insurer approval |
| Backups | 35 days | Backup date | Encrypted rotation; deletion propagates as backups expire |

These are maximum operational defaults, not promises to retain every record for the full period. A documented legal hold, fraud investigation, active dispute, statutory duty, or security need may extend a period.

## Request procedure

1. Log the request, jurisdiction, scope, receipt time, and due date in the privacy-request register.
2. Verify identity using account/session evidence or two matching submission attributes. Never request or send a password by email.
3. Search production database, email/call systems, support records, and active exports. Identify legal holds and required exceptions.
4. Export, correct, delete, or de-identify the in-scope records. Preserve a minimal suppression record when deletion would cause renewed contact.
5. Have a second authorized reviewer confirm completion and record systems searched, rows affected, exceptions, reviewer, and completion time.
6. Respond securely. If denied, state the reason and any applicable appeal method. Track backup expiry rather than restoring backups solely to delete one record.

Production deletion must use an approved, narrowly scoped script or transaction with a preview/count step and a recoverable backup. No ad-hoc broad deletion command is permitted.
