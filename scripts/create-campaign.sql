-- DMV Contractor Outreach Campaign - Icebreaker with rating math
INSERT INTO "EmailCampaign" (
  id, name, audience, subject, "bodyTemplate", "templateId",
  filters, "replyTo", status, "ownerAgentId",
  "createdAt", "updatedAt"
) VALUES (
  'dmv-outreach-2026-icebreaker',
  'DMV Contractor Outreach — Icebreaker with Rating Math',
  'prospect_contractor',
  'The homeowner who ghosted you says hi',
  E'Hi {{greetingName}},\n\nYou don''t know me, so instead of introducing myself, let me guess a few things about you:\n\nSomewhere in your phone right now is a homeowner you quoted three weeks ago who vanished into thin air. You''ve rebuilt at least one "I saw it on Pinterest" idea this year. And the jobs you''re best at are NOT the ones that walk in the door most often.\n\nIf I got two out of three right, keep reading. (I usually get all three.)\n\nI''m {{agentName}} with Renovessa. We put {{tradeLabel}} pros in {{city}} in front of homeowners who are actually ready to start — not tire-kickers collecting five quotes for sport. {{ratingLine}}\n\n{{ratingMath}}\n\nHere''s how we fix that:\n\n1. We personally reach out to your past customers, ask them for feedback and reviews — we handle the awkward follow-ups so you don''t have to.\n2. Technical audit and optimization of your Google Business Profile — most contractors leave money on the table with incomplete profiles.\n3. Systematic policy enforcement — we flag and request takedowns of reviews that violate Google''s policies.\n4. Review automation — we set up a system that consistently generates new reviews from every completed job.\n\nThe target: bringing {{companyName}} to a 4.9 within 3 to 6 months.\n\nAnd here''s the best part — we run renovessa.com, where homeowners submit real project inquiries. We can land you actual customers while we work on your reputation.\n\nDo you keep track of — or have phone numbers of — your past customers? We''d need to reach out to them.\n\nJust hit reply. One word works — even "how?" — and I''ll take it from there.\n\nQuick favor: if you''re the one reading the inbox but not the one who decides where new work comes from, forward this to the owner. They''ll thank you when the calendar fills up.\n\n{{agentName}}\nRenovessa\n\nP.S. Buried in the busy season? Reply "later" and I''ll circle back when the dust settles. Ignoring me is also an option — but where''s the fun in that?',
  'prospect_contractor_intro',
  '{}',
  'ray@inbound.renovessa.com',
  'draft',
  'cmrdlvean0000mvpurtn9aqox',
  NOW(),
  NOW()
);
