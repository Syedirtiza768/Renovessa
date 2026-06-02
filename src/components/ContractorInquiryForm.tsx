"use client";

import { useState } from "react";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export function ContractorInquiryForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    trade: "",
    serviceZips: "",
    yearsInBusiness: "",
    employeeCount: "",
    licensedInsured: false,
    usesLeadGen: false,
    avgJobSize: "",
    referralSource: "",
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contractor-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card-accent p-8 text-center">
        <h3 className="text-xl font-semibold text-slate">Inquiry Received</h3>
        <p className="mt-2 text-muted">Our contractor success team will review your application within 1–2 business days.</p>
      </div>
    );
  }

  return (
    <form id="inquiry" onSubmit={submit} className="card p-6 space-y-4">
      <h3 className="text-lg font-semibold">Contractor Application</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Company Name</label>
          <input className="input" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required />
        </div>
        <div>
          <label className="label">Owner / Contact Name</label>
          <input className="input" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Phone</label>
          <input className="input" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">Trade / Service Category</label>
        <select className="input" value={form.trade} onChange={(e) => update("trade", e.target.value)} required>
          <option value="">Select trade</option>
          {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Primary ZIP Codes Served</label>
        <input className="input" placeholder="e.g. 22201, 22202, 22203" value={form.serviceZips} onChange={(e) => update("serviceZips", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Years in Business</label>
          <input className="input" type="number" value={form.yearsInBusiness} onChange={(e) => update("yearsInBusiness", e.target.value)} />
        </div>
        <div>
          <label className="label">Full-Time Employees</label>
          <input className="input" type="number" value={form.employeeCount} onChange={(e) => update("employeeCount", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.licensedInsured} onChange={(e) => update("licensedInsured", e.target.checked)} />
        Currently licensed and insured
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.usesLeadGen} onChange={(e) => update("usesLeadGen", e.target.checked)} />
        Currently using Angi, HomeAdvisor, Thumbtack, or similar
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Submitting..." : "Request Contractor Access"}
      </button>
    </form>
  );
}
