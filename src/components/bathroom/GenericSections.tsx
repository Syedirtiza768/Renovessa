export function BathroomCostGuide() {
  return (
    <section className="px-4 py-12 sm:px-6 bg-bone-1">
      <div className="mx-auto max-w-5xl">
        <h2 className="landing-h2">Bathroom remodeling cost guide</h2>
        <p className="mt-3 max-w-3xl text-ink-70">
          Planning ranges below are illustrative and depend on bathroom size, scope, finish tier, and site conditions.
          The planner produces a project-specific range after you answer its questions.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Powder-room refresh", low: "$2,500", high: "$6,500" },
            { t: "Guest bath remodel", low: "$9,000", high: "$22,000" },
            { t: "Primary bath remodel", low: "$18,000", high: "$45,000" },
            { t: "Tub-to-shower conversion", low: "$7,000", high: "$18,000" },
            { t: "Walk-in shower", low: "$9,000", high: "$22,000" },
            { t: "Full gut remodel", low: "$22,000", high: "$55,000" },
          ].map((c) => (
            <article key={c.t} className="landing-card p-5">
              <h3 className="font-semibold text-ink-100">{c.t}</h3>
              <p className="mt-2 text-sm text-ink-70">
                Planning range: <span className="font-medium text-ink-100">{c.low} – {c.high}</span>
              </p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs text-ink-40">
          Illustrative planning ranges only. Not a binding quote. Final pricing depends on site conditions, permits,
          material selections, and contractor bids.
        </p>
      </div>
    </section>
  );
}

export function BathroomPermitPreview() {
  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="landing-h2">Permit navigator preview</h2>
        <p className="mt-3 max-w-3xl text-ink-70">
          Local permit rules depend on the exact scope of your project. The planner asks a few questions
          and outputs likely permit categories with cautious wording — never a legal determination.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="landing-card p-5">
            <h3 className="font-semibold text-ink-100">Common permit categories</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-ink-70 space-y-1">
              <li>Building permit — new bathroom, structural framing, wall changes</li>
              <li>Plumbing permit — fixture relocation, plumbing changes</li>
              <li>Electrical permit — wiring or lighting circuit changes</li>
              <li>Mechanical permit — ventilation modifications</li>
              <li>HOA / condo board review</li>
            </ul>
          </div>
          <div className="landing-card p-5">
            <h3 className="font-semibold text-ink-100">Likelihood language</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-ink-70 space-y-1">
              <li>Likely required</li>
              <li>May be required</li>
              <li>Contractor verification needed</li>
              <li>Jurisdiction review needed</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BathroomFaq() {
  const faqs = [
    {
      q: "Is the planning estimate a contractor quote?",
      a: "No. The estimate is a localized planning range based on your structured answers. A contractor quote requires an on-site visit and a signed proposal.",
    },
    {
      q: "Are my contact details sent to multiple contractors automatically?",
      a: "No. Your contact details are only released to a contractor after you reconfirm, the contractor accepts, and Renovessa records the release. You control the maximum number of contractors.",
    },
    {
      q: "Does Renovessa perform the construction?",
      a: "No. Renovessa helps you plan and organizes contractor bids. Contractors are independent businesses; verify credentials and contract terms before signing.",
    },
    {
      q: "Can I use the planner without creating an account?",
      a: "Yes. Anonymous progress is saved in your browser. You create an account or verify contact information before downloading the full brief, sharing a private link, or requesting contractor bids.",
    },
    {
      q: "Does the diagram builder produce permit drawings?",
      a: "No. Diagrams are conceptual planning tools. They are not architectural, engineering, construction, or permit drawings. All measurements and site conditions must be verified by the selected contractor or a qualified design professional.",
    },
  ];
  return (
    <section className="px-4 py-12 sm:px-6 bg-bone-1">
      <div className="mx-auto max-w-3xl">
        <h2 className="landing-h2">Frequently asked questions</h2>
        <dl className="mt-6 space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="landing-card p-5">
              <dt className="font-semibold text-ink-100">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-70">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function BathroomMethodology() {
  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl text-sm leading-relaxed text-ink-70">
        <h2 className="text-xl font-semibold text-ink-100">Methodology, sources, and review</h2>
        <p className="mt-3">
          The bathroom estimator uses a deterministic per-square-foot baseline by project objective, multiplied
          by bathroom type, finish tier, and a local location factor. Complexity multipliers add for plumbing
          relocation, electrical modifications, full-height tile, curbless shower structural allowance, condominium
          high-floor access, and older-home conditions. Contingency and GC overhead are applied as percentages.
        </p>
        <p className="mt-3">
          Numeric ranges are withheld from public display until a reviewer approves the exact estimator configuration
          version. AI never sets prices, dimensions, permit determinations, or contractor qualifications.
        </p>
        <dl className="mt-5 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-ink-40">Author</dt><dd>Renovessa editorial team</dd></div>
          <div><dt className="text-ink-40">Reviewer</dt><dd>Renovessa operations</dd></div>
          <div><dt className="text-ink-40">Last reviewed</dt><dd>July 26, 2026</dd></div>
          <div><dt className="text-ink-40">Last updated</dt><dd>July 26, 2026</dd></div>
        </dl>
        <p className="mt-5 text-xs text-ink-40">
          Source links and official jurisdiction references are maintained in the admin content system and reviewed
          periodically. Requirements can change; confirm current rules with your local jurisdiction and relevant
          licensing authorities before construction.
        </p>
      </div>
    </section>
  );
}
