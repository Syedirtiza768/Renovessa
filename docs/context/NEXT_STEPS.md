# Next Steps

1. **Send RFQ pilot 50** — use `rfq_pilot_50_email_drafts.csv`; track yes/info/later/bounce by trade
2. **Ops bid workflow for estimate-wizard RFQs** — review `source=estimate_wizard` leads, solicit contractor bids, return options to homeowner
3. **Align `/for-contractors` copy** with RFQ/bid language (homepage already updated; contractor page still says “verified appointments”)
4. **UAT RFQ confirmations** — submit test RFQ + contractor application; confirm SendGrid emails arrive
5. **Fix SendGrid domain authentication** — re-add `renovessa.com` as a bare domain and add the 3 SendGrid CNAMEs so custom DKIM/SPF is active
6. **Phase 2+ (deferred)** — SMS integration, calendar ICS, forgot-password email, payment gateway
