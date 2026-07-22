# Security Incident Response Procedure

**Owner:** Incident commander designated by the operator

**Version:** 2026-07-23-v1

**Severity:** SEV-1 confirmed/high-likelihood personal-data compromise; SEV-2 contained material event; SEV-3 suspicious/low-impact event

## Response

1. **Report and log:** record reporter, UTC time, affected system, indicators, data, and initial severity. Preserve original reports.
2. **Contain:** revoke exposed credentials/tokens, block malicious access, isolate affected components, preserve logs, and avoid destroying evidence.
3. **Investigate:** establish timeline, entry point, systems/accounts/data affected, number and residence of people affected, encryption status, acquisition likelihood, and ongoing risk.
4. **Eradicate and recover:** patch the cause, rotate secrets, validate clean builds/backups, restore service in stages, and increase monitoring.
5. **Legal/notification assessment:** involve qualified counsel as appropriate; assess federal, DC, Maryland, Virginia, contractual, insurer, and law-enforcement requirements. Record the decision, deadlines, content, recipients, and basis. Do not delay required notice for marketing or reputational reasons.
6. **Communicate:** use accurate, approved facts; identify what happened, affected information, steps taken, protective actions, and contact point. Do not make unsupported assurances.
7. **Close and learn:** complete root-cause and control-gap reviews, assign remediations with owners/dates, confirm vendor obligations, and test the corrective controls.

The incident log, evidence, decisions, notices, and remediation proof are restricted to authorized personnel. Run a tabletop exercise at least annually and after major architecture changes.
