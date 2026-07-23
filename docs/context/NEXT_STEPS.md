# Next Steps

## SEO next phase

- **Connect measurement** - verify Search Console, submit `/sitemap.xml`, and add privacy-safe organic estimate/RFQ/qualified-RFQ attribution
- **Publish the first evidence-rich cluster** - Northern Virginia HVAC cost guide, Fairfax HVAC permit guide, and bid-comparison tool linked to the implemented HVAC and Fairfax hubs
- **Earn proof before case studies** - keep `/case-studies` noindexed until real, consented, specific project evidence is available
- **Expand only with fulfillment** - add trades and ZIP clusters only when contractor capacity and unique local evidence meet the strategy quality gate

## Product and operations

1. **Complete estimator evidence review** — attach representative, dated DMV bids/invoices or defensible datasets to every range record; reviewer approves the exact model version before configuring `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION`
2. **Operationalize privacy** — name privacy/security owners, complete the vendor register, run the first incident tabletop, and create the restricted privacy-request register
3. **Harden authentication** — add rate limiting, MFA for privileged users, automated IDOR/consent tests, and a single-use expiring-token recovery email flow
4. **Configure Twilio opt-out webhook when SMS is enabled** — point inbound messaging to `/api/webhooks/twilio/sms` and retain signature validation

5. **Monitor RFQ Pilot 15 replies** — campaign `cmrws4saz000hmv43jgoh5rmk` sent 15/15 on 2026-07-23; track yes/info/later and one follow-up to non-responders after 4–5 business days
6. **Rotate the previously exposed SendGrid API key** — create a replacement key, update production without printing it, restart the app, then revoke the exposed key
7. **Enable the signed SendGrid event webhook** — point it to `https://renovessa.com/api/webhooks/sendgrid/events`, enable delivery/bounce/drop/spam/unsubscribe events, enable signature verification, store the public verification key, and test the endpoint
8. **Ops bid workflow for estimate-wizard RFQs** - review `source=estimate_wizard` leads, solicit contractor bids, return options to homeowner
9. **UAT RFQ confirmations** - submit test RFQ + contractor application; confirm SendGrid emails arrive after key rotation
