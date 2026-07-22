# Next Steps

1. **Ops bid workflow for estimate-wizard RFQs** — review `source=estimate_wizard` leads, solicit contractor bids, return options to homeowner
2. **UAT the estimate wizard** — walk each trade path; confirm ballparks feel realistic; submit a test RFQ
3. **First real pilot job** — follow first-job MVP workflow end-to-end with ops team
4. **Phase 2+ (deferred)** — SMS integration, calendar ICS, forgot-password email, payment gateway
5. **Fix SendGrid domain authentication** — re-add `renovessa.com` as a bare domain (current entry is malformed `https://renovessa.com/`) and add the 3 SendGrid CNAMEs so custom DKIM/SPF is active
