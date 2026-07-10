# Next Steps

1. **UAT the portal gap fixes** — homeowner submit/detail/settings, agent my-leads, admin team CRUD
2. **First real pilot job** — follow first-job MVP workflow end-to-end with ops team
3. **Phase 2+ (deferred)** — SMS integration, calendar ICS, forgot-password email, payment gateway
4. **Fix SendGrid domain authentication** — re-add `renovessa.com` as a bare domain (current entry is malformed `https://renovessa.com/`) and add the 3 SendGrid CNAMEs so custom DKIM/SPF is active; email sending already works via verified single-sender `ray@renovessa.com` but deliverability is at risk without it
