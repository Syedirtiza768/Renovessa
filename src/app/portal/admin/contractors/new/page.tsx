"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewContractorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    trade: "",
    serviceZips: "",
    licenseVerified: false,
    insuranceVerified: false,
    yearsInBusiness: "",
    employeeCount: "",
    contactPerson: "",
    pilotTerms: "",
    firstAppointmentPricing: "free",
    pilotPriceAmount: "",
    responseTimeHours: "",
    availabilityNotes: "",
    internalNotes: "",
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function submit() {
    if (!form.name || !form.email || !form.companyName || !form.trade) {
      setError("Name, email, company name, and trade are required.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        serviceZips: form.serviceZips.split(",").map((z) => z.trim()).filter(Boolean),
        yearsInBusiness: form.yearsInBusiness ? parseInt(form.yearsInBusiness) : null,
        employeeCount: form.employeeCount ? parseInt(form.employeeCount) : null,
        pilotPriceAmount: form.pilotPriceAmount ? parseFloat(form.pilotPriceAmount) : null,
        responseTimeHours: form.responseTimeHours ? parseInt(form.responseTimeHours) : null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create contractor");
    } else {
      router.push("/portal/admin/contractors");
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Add Contractor</h1>
      <div className="mt-6 card p-4 max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Contact Name *</label>
              <input className="input mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Email *</label>
              <input type="email" className="input mt-1" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Phone</label>
              <input className="input mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Company Name *</label>
              <input className="input mt-1" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Trade *</label>
              <input className="input mt-1" value={form.trade} onChange={(e) => update("trade", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Service ZIPs (comma-separated)</label>
              <input className="input mt-1" placeholder="22030, 22031, 22032" value={form.serviceZips} onChange={(e) => update("serviceZips", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.licenseVerified} onChange={(e) => update("licenseVerified", e.target.checked)} className="accent-accent" />
              License Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.insuranceVerified} onChange={(e) => update("insuranceVerified", e.target.checked)} className="accent-accent" />
              Insurance Verified
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Years in Business</label>
              <input type="number" className="input mt-1" value={form.yearsInBusiness} onChange={(e) => update("yearsInBusiness", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Employee Count</label>
              <input type="number" className="input mt-1" value={form.employeeCount} onChange={(e) => update("employeeCount", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Pilot Terms</label>
            <textarea className="input mt-1" rows={2} placeholder="First appointment free, follow-up pricing TBD" value={form.pilotTerms} onChange={(e) => update("pilotTerms", e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted">First Appt Pricing</label>
              <select className="input mt-1" value={form.firstAppointmentPricing} onChange={(e) => update("firstAppointmentPricing", e.target.value)}>
                <option value="free">Free</option>
                <option value="discounted">Discounted</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Pilot Price Amount</label>
              <input type="number" className="input mt-1" value={form.pilotPriceAmount} onChange={(e) => update("pilotPriceAmount", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Response SLA (hours)</label>
              <input type="number" className="input mt-1" value={form.responseTimeHours} onChange={(e) => update("responseTimeHours", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Internal Notes</label>
            <textarea className="input mt-1" rows={2} value={form.internalNotes} onChange={(e) => update("internalNotes", e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" className="btn-primary w-full" onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Contractor"}
          </button>
        </div>
      </div>
    </div>
  );
}
