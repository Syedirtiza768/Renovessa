import type { EstimatorSnapshot } from "@/lib/estimator-submission";

export function EstimatorSubmissionSummary({ snapshot }: { snapshot: EstimatorSnapshot }) {
  const estimate = snapshot.estimate && typeof snapshot.estimate === "object"
    ? snapshot.estimate as Record<string, unknown>
    : null;
  const contact = snapshot.contact ?? {};

  return (
    <section className="mt-6 card p-4" aria-labelledby="estimator-responses-heading">
      <h2 id="estimator-responses-heading" className="font-semibold">Estimator responses</h2>
      <p className="mt-1 text-sm text-muted">Your saved answers for the {snapshot.estimatorLabel.toLowerCase()} estimate.</p>

      <div className="mt-4 space-y-5">
        {snapshot.sections.map((section) => (
          <div key={section.id}>
            <h3 className="text-sm font-semibold text-slate">{section.label}</h3>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={`${section.id}-${field.id}`} className="border-b border-rule/50 pb-2 text-sm">
                  <dt className="text-muted">{field.label}{field.unit ? ` (${field.unit})` : ""}</dt>
                  <dd className="mt-0.5 font-medium">{field.displayValue || field.value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {snapshot.notes && (
          <div>
            <h3 className="text-sm font-semibold text-slate">Project notes</h3>
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-blueprint/40 p-3 text-sm text-muted">{snapshot.notes}</p>
          </div>
        )}

        {estimate && (
          <div>
            <h3 className="text-sm font-semibold text-slate">Planning estimate</h3>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {numberRow(estimate, "low", "Low")}
              {numberRow(estimate, "mid", "Mid")}
              {numberRow(estimate, "high", "High")}
              {numberRow(estimate, "expectedLow", "Expected low")}
              {numberRow(estimate, "expectedHigh", "Expected high")}
              {numberRow(estimate, "installedCostLow", "Installed cost — low")}
              {numberRow(estimate, "installedCostHigh", "Installed cost — high")}
              {numberRow(estimate, "netCostLow", "Net cost — low")}
              {numberRow(estimate, "netCostHigh", "Net cost — high")}
              {textRow(estimate, "confidence", "Confidence")}
              {textRow(estimate, "summary", "Summary")}
              {booleanEstimateRow(estimate, "displayable", "Public cost range available")}
              {textRow(estimate, "withheldReason", "Why a cost range may be withheld")}
            </dl>
            {stringArray(estimate.drivers).length > 0 && (
              <List label="Cost drivers" items={stringArray(estimate.drivers)} />
            )}
            {stringArray(estimate.assumptions).length > 0 && (
              <List label="Assumptions" items={stringArray(estimate.assumptions)} />
            )}
            {stringArray(estimate.exclusions).length > 0 && (
              <List label="Exclusions" items={stringArray(estimate.exclusions)} />
            )}
            {stringArray(estimate.unknowns).length > 0 && (
              <List label="Still to verify" items={stringArray(estimate.unknowns)} />
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate">Proposal contact preferences</h3>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {contactRow(contact, "firstName", "First name")}
            {contactRow(contact, "lastName", "Last name")}
            {contactRow(contact, "email", "Email")}
            {contactRow(contact, "phone", "Mobile phone")}
            {contactRow(contact, "zipCode", "Project ZIP code")}
            {contactRow(contact, "timeline", "Desired start")}
            {contactRow(contact, "preferredContact", "Preferred contact")}
            {contactRow(contact, "maxContractors", "Contractors requested")}
            {booleanRow(contact, "tcpaConsent", "Calls/texts consent")}
            {booleanRow(contact, "termsAccepted", "Terms accepted")}
            {booleanRow(contact, "privacyAcknowledged", "Privacy acknowledged")}
          </dl>
          {typeof contact.notes === "string" && contact.notes.trim() && (
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-blueprint/40 p-3 text-sm text-muted">{contact.notes}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function numberRow(values: Record<string, unknown>, key: string, label: string) {
  const value = values[key];
  if (typeof value !== "number") return null;
  return <div key={key} className="border-b border-rule/50 pb-2 text-sm"><dt className="text-muted">{label}</dt><dd className="mt-0.5 font-medium">${value.toLocaleString()}</dd></div>;
}

function textRow(values: Record<string, unknown>, key: string, label: string) {
  const value = values[key];
  if (typeof value !== "string" || !value) return null;
  return <div key={key} className="border-b border-rule/50 pb-2 text-sm"><dt className="text-muted">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>;
}

function contactRow(values: Record<string, unknown>, key: string, label: string) {
  const value = values[key];
  if (value === undefined || value === null || value === "") return null;
  return <div key={key} className="border-b border-rule/50 pb-2 text-sm"><dt className="text-muted">{label}</dt><dd className="mt-0.5 font-medium">{String(value)}</dd></div>;
}

function booleanRow(values: Record<string, unknown>, key: string, label: string) {
  if (typeof values[key] !== "boolean") return null;
  return <div key={key} className="border-b border-rule/50 pb-2 text-sm"><dt className="text-muted">{label}</dt><dd className="mt-0.5 font-medium">{values[key] ? "Yes" : "No"}</dd></div>;
}

function booleanEstimateRow(values: Record<string, unknown>, key: string, label: string) {
  if (typeof values[key] !== "boolean") return null;
  return <div key={key} className="border-b border-rule/50 pb-2 text-sm"><dt className="text-muted">{label}</dt><dd className="mt-0.5 font-medium">{values[key] ? "Yes" : "No"}</dd></div>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
