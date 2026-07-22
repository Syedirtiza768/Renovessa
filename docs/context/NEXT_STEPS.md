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

5. **Send RFQ pilot 50** - use `rfq_pilot_50_email_drafts.csv`; track yes/info/later/bounce by trade
6. **Ops bid workflow for estimate-wizard RFQs** - review `source=estimate_wizard` leads, solicit contractor bids, return options to homeowner
7. **UAT RFQ confirmations** - submit test RFQ + contractor application; confirm SendGrid emails arrive
8. **Fix SendGrid domain authentication** - re-add `renovessa.com` as a bare domain and add the three SendGrid CNAMEs so custom DKIM/SPF is active
