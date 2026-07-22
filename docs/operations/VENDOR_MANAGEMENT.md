# Privacy and Security Vendor Procedure

**Owner:** Security/privacy lead

**Version:** 2026-07-23-v1

Maintain a vendor register containing legal name, service, owner, data categories, data subjects, processing location, subprocessors, retention, deletion method, contract/DPA date, security evidence, incident contact, last review, and exit plan.

## Before use

1. Document necessity and data minimization; do not send a vendor data it does not need.
2. Review security documentation, authentication/access controls, encryption, breach history, availability, deletion/export support, subprocessors, and relevant certifications.
3. Put confidentiality, purpose limitation, security, incident notice, subprocessor, return/deletion, and audit/assurance terms in the contract or DPA.
4. Obtain privacy/security owner approval before production credentials or personal data are provided.
5. Configure least privilege, separate production credentials, secret rotation, logging, and the shortest practical vendor retention.

## Current technical integrations to register

- Infrastructure/hosting and PostgreSQL provider
- SendGrid/Twilio email delivery and event webhooks
- Twilio voice/SMS when credentials and webhooks are enabled
- OpenRouter and the selected model provider for AI-advisor prompts
- Domain/DNS, monitoring, analytics, backup, and support services if enabled

Review critical vendors annually and after a material incident or service change. On exit, revoke credentials, export needed records, request deletion, obtain confirmation where available, and update the Privacy Policy if data practices changed.
