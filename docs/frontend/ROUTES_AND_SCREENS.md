# Routes and Screens

> **Status:** Implemented in the Next.js App Router. Last reviewed 2026-07-23.

## Public acquisition and SEO routes

| Route | Purpose | Indexing |
|---|---|---|
| `/` | DMV estimator + managed RFQ landing page | Index |
| `/estimate` | Crawlable estimate-wizard entry | Index |
| `/how-it-works` | Estimate -> RFQ -> contractor-response process | Index |
| `/for-homeowners` | Homeowner explanation and embedded estimator | Index |
| `/for-contractors` | Contractor RFQ application | Index |
| `/services`, `/services/hvac` | Service architecture and first HVAC hub | Index |
| `/locations`, `/locations/northern-virginia`, `/locations/northern-virginia/fairfax-county` | DMV location architecture and first county hub | Index |
| `/cost-guides`, `/resources` | Editorial hubs and official-source library | Index |
| `/trust`, `/methodology/*` | Estimate and contractor-review disclosures | Index |
| `/about`, `/contact`, `/editorial-policy` | Entity and editorial trust | Index |
| `/privacy`, `/terms`, `/accessibility`, `/tcpa` | Legal, accessibility, and communication disclosures | Index |
| `/case-studies` | Honest placeholder pending real evidence | Noindex |
| `/thank-you` | RFQ confirmation | Noindex |
| `/login` | Account login | Noindex |
| `/robots.txt`, `/sitemap.xml` | Crawler directives and indexable URL discovery | Public |

## Authenticated routes

- `/portal/homeowner/*` - project status, project detail, settings, and RFQ submission
- `/portal/contractor/*` - appointments, billing, profile, and settings
- `/portal/admin/*` - operations, leads, contractors, capacity, finance, disputes, campaigns, contacts, team, and communications

All `/portal/*` routes are authenticated as applicable, excluded from the XML sitemap, disallowed in robots.txt, and carry noindex metadata.

## Shared public behavior

- Public header exposes Estimate, Cost Guides, Services, Locations, Resources, and How It Works
- Public footer exposes company, trust/methodology, resources, and legal routes
- Indexable pages use shared canonical, Open Graph, Twitter, and robots metadata
- Organization/WebSite, Service, and Breadcrumb JSON-LD are emitted only where supported by visible page content
