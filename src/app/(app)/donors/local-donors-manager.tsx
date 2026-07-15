"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { z } from "zod";
import { StatusBadge } from "@/components/data-display/status-badge";
import { appendAuditLogEntry, loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import { deriveDonorRows, filterDonorRows } from "@/lib/local-data/donors";
import type { LocalDonation, LocalDonor, LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

const donorSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  phone: z.string().max(60),
  whatsapp: z.string().max(60),
  email: z.string().email("Enter a valid email address.").or(z.literal("")),
  country: z.string().min(2, "Country is required."),
  preferredContactMethod: z.enum(["Phone", "WhatsApp", "Email"]),
  donorType: z.enum(["Individual", "Corporate", "Foundation", "Community"]),
  givingPreferences: z.string(),
  zakatPreference: z.string(),
  recurringDonor: z.boolean(),
  notes: z.string(),
  taxReceiptStatus: z.enum(["Not Required", "Pending", "Issued"]),
  nextUpdateDueDate: z.string(),
  reminderStatus: z.enum(["None", "Upcoming", "Overdue", "Completed"]),
});

type DonorForm = z.infer<typeof donorSchema>;

const emptyForm: DonorForm = {
  fullName: "",
  phone: "",
  whatsapp: "",
  email: "",
  country: "",
  preferredContactMethod: "Email",
  donorType: "Individual",
  givingPreferences: "",
  zakatPreference: "",
  recurringDonor: false,
  notes: "",
  taxReceiptStatus: "Pending",
  nextUpdateDueDate: "",
  reminderStatus: "None",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `donor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function donorToForm(donor: LocalDonor): DonorForm {
  return {
    fullName: donor.fullName,
    phone: donor.phone,
    whatsapp: donor.whatsapp,
    email: donor.email,
    country: donor.country,
    preferredContactMethod: donor.preferredContactMethod,
    donorType: donor.donorType,
    givingPreferences: donor.givingPreferences.join(", "),
    zakatPreference: donor.zakatPreference,
    recurringDonor: donor.recurringDonor,
    notes: donor.notes,
    taxReceiptStatus: donor.taxReceiptStatus,
    nextUpdateDueDate: donor.nextUpdateDueDate,
    reminderStatus: donor.reminderStatus,
  };
}

export function LocalDonorsManager() {
  const workspaceRef = useRef<LocalWorkspace | null>(null);
  const [donors, setDonors] = useState<LocalDonor[]>([]);
  const [donations, setDonations] = useState<LocalDonation[]>([]);
  const [form, setForm] = useState<DonorForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof DonorForm, string>>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | LocalDonor["donorType"]>("All");
  const [reminderFilter, setReminderFilter] = useState<"All" | LocalDonor["reminderStatus"]>("All");
  const [hydrated, setHydrated] = useState(false);
  const [sampleDataEnabled, setSampleDataEnabled] = useState(true);

  useEffect(() => {
    const workspace = loadLocalWorkspace();
    workspaceRef.current = workspace;
    setDonors(workspace.donors);
    setDonations(workspace.donations);
    setSampleDataEnabled(workspace.sampleDataEnabled);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !workspaceRef.current) {
      return;
    }

    workspaceRef.current = saveLocalWorkspace({ ...workspaceRef.current, donors });
  }, [donors, hydrated]);

  const donorRows = useMemo(() => {
    return deriveDonorRows(donors, donations);
  }, [donations, donors]);

  const filteredDonors = useMemo(() => {
    return filterDonorRows(donorRows, { search, typeFilter, reminderFilter });
  }, [donorRows, reminderFilter, search, typeFilter]);

  function updateForm<Key extends keyof DonorForm>(key: Key, value: DonorForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  }

  function saveWithAudit(nextDonors: LocalDonor[], action: "created" | "updated" | "deleted", donorId: string) {
    if (!workspaceRef.current) {
      return;
    }

    const auditedWorkspace = appendAuditLogEntry({ ...workspaceRef.current, donors: nextDonors }, {
      entityType: "donor",
      entityId: donorId,
      action,
      actor: "Local Demo User",
      metadata: { donorCount: nextDonors.length },
    });

    workspaceRef.current = saveLocalWorkspace(auditedWorkspace);
    setDonors(auditedWorkspace.donors);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = donorSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: fieldErrors.fullName?.[0],
        email: fieldErrors.email?.[0],
        country: fieldErrors.country?.[0],
      });
      return;
    }

    const nextDonor: LocalDonor = {
      id: editingId ?? createId(),
      fullName: parsed.data.fullName.trim(),
      phone: parsed.data.phone.trim(),
      whatsapp: parsed.data.whatsapp.trim(),
      email: parsed.data.email.trim(),
      country: parsed.data.country.trim(),
      preferredContactMethod: parsed.data.preferredContactMethod,
      donorType: parsed.data.donorType,
      givingPreferences: parsed.data.givingPreferences
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      zakatPreference: parsed.data.zakatPreference.trim(),
      recurringDonor: parsed.data.recurringDonor,
      notes: parsed.data.notes.trim(),
      taxReceiptStatus: parsed.data.taxReceiptStatus,
      updateHistory: editingId ? donors.find((donor) => donor.id === editingId)?.updateHistory ?? [] : [],
      nextUpdateDueDate: parsed.data.nextUpdateDueDate,
      reminderStatus: parsed.data.reminderStatus,
    };

    const nextDonors = editingId ? donors.map((donor) => (donor.id === editingId ? nextDonor : donor)) : [nextDonor, ...donors];
    saveWithAudit(nextDonors, editingId ? "updated" : "created", nextDonor.id);
    resetForm();
  }

  function deleteDonor(donor: LocalDonor) {
    const confirmed = window.confirm(`Delete donor "${donor.fullName}" from this browser's local workspace?`);
    if (!confirmed) {
      return;
    }

    const nextDonors = donors.filter((item) => item.id !== donor.id);
    saveWithAudit(nextDonors, "deleted", donor.id);
    if (editingId === donor.id) {
      resetForm();
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit donor" : "Add donor"}</h2>
        <p className="mt-1 text-sm text-slate-500">Stored locally in demo mode. Giving totals below are derived from workspace donations.</p>
        {sampleDataEnabled ? (
          <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Sample donor records are loaded in this browser.</p>
        ) : null}

        <form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <Field className="lg:col-span-2" label="Full name" error={errors.fullName}>
            <input className={inputClass} onChange={(event) => updateForm("fullName", event.target.value)} placeholder="Donor name" value={form.fullName} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} onChange={(event) => updateForm("phone", event.target.value)} placeholder="Phone" value={form.phone} />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} onChange={(event) => updateForm("whatsapp", event.target.value)} placeholder="WhatsApp" value={form.whatsapp} />
          </Field>
          <Field className="lg:col-span-2" label="Email" error={errors.email}>
            <input className={inputClass} onChange={(event) => updateForm("email", event.target.value)} placeholder="Email" value={form.email} />
          </Field>
          <Field label="Country" error={errors.country}>
            <input className={inputClass} onChange={(event) => updateForm("country", event.target.value)} placeholder="Country" value={form.country} />
          </Field>
          <Field label="Preferred contact">
            <select className={inputClass} onChange={(event) => updateForm("preferredContactMethod", event.target.value as DonorForm["preferredContactMethod"])} value={form.preferredContactMethod}>
              <option value="Phone">Phone</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
            </select>
          </Field>
          <Field label="Donor type">
            <select className={inputClass} onChange={(event) => updateForm("donorType", event.target.value as DonorForm["donorType"])} value={form.donorType}>
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate</option>
              <option value="Foundation">Foundation</option>
              <option value="Community">Community</option>
            </select>
          </Field>
          <Field label="Giving preferences">
            <input className={inputClass} onChange={(event) => updateForm("givingPreferences", event.target.value)} placeholder="Comma-separated interests" value={form.givingPreferences} />
          </Field>
          <Field label="Zakat preference">
            <input className={inputClass} onChange={(event) => updateForm("zakatPreference", event.target.value)} placeholder="Zakat preference" value={form.zakatPreference} />
          </Field>
          <Field label="Tax receipt status">
            <select className={inputClass} onChange={(event) => updateForm("taxReceiptStatus", event.target.value as DonorForm["taxReceiptStatus"])} value={form.taxReceiptStatus}>
              <option value="Not Required">Not Required</option>
              <option value="Pending">Pending</option>
              <option value="Issued">Issued</option>
            </select>
          </Field>
          <Field label="Next update due">
            <input className={inputClass} onChange={(event) => updateForm("nextUpdateDueDate", event.target.value)} type="date" value={form.nextUpdateDueDate} />
          </Field>
          <Field label="Reminder status">
            <select className={inputClass} onChange={(event) => updateForm("reminderStatus", event.target.value as DonorForm["reminderStatus"])} value={form.reminderStatus}>
              <option value="None">None</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-emerald-100 px-3 py-2 text-sm font-medium text-slate-700">
            <input checked={form.recurringDonor} onChange={(event) => updateForm("recurringDonor", event.target.checked)} type="checkbox" />
            Recurring donor
          </label>
          <Field className="lg:col-span-4" label="Notes">
            <textarea className={cn(inputClass, "min-h-24 py-3")} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Context, preferences, stewardship notes" value={form.notes} />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800">
              {editingId ? "Save changes" : "Create donor"}
            </button>
            {editingId ? (
              <button className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={resetForm} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid gap-3 border-b border-emerald-100 p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search donor, country, contact, preferences..." value={search} />
          </div>
          <select className={inputClass} onChange={(event) => setTypeFilter(event.target.value as "All" | LocalDonor["donorType"])} value={typeFilter}>
            <option value="All">All donor types</option>
            <option value="Individual">Individual</option>
            <option value="Corporate">Corporate</option>
            <option value="Foundation">Foundation</option>
            <option value="Community">Community</option>
          </select>
          <select className={inputClass} onChange={(event) => setReminderFilter(event.target.value as "All" | LocalDonor["reminderStatus"])} value={reminderFilter}>
            <option value="All">All reminder states</option>
            <option value="None">None</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {filteredDonors.map((donor) => (
            <article key={donor.id} className="rounded-lg border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{donor.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{donor.donorType} · {donor.country}</p>
                </div>
                <StatusBadge value={donor.effectiveReminderStatus === "Overdue" ? "At Risk" : donor.effectiveReminderStatus === "Upcoming" ? "Review" : donor.recurringDonor ? "Strong" : "New"} />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Metric label="Lifetime USD" value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(donor.lifetimeUsd)} />
                <Metric label="Lifetime PKR" value={new Intl.NumberFormat("en-US", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(donor.lifetimePkr)} />
                <Metric label="Donations" value={String(donor.donationCount)} />
                <Metric label="Last donation" value={donor.lastDonationDate || "No donations yet"} />
              </div>

              <div className="mt-5 space-y-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">Preferred contact:</span> {donor.preferredContactMethod}</p>
                <p><span className="font-medium text-slate-900">Giving preferences:</span> {donor.givingPreferences.length ? donor.givingPreferences.join(", ") : "Not set"}</p>
                <p><span className="font-medium text-slate-900">Projects supported:</span> {donor.projectsSupported.length ? donor.projectsSupported.join(", ") : "None yet"}</p>
                <p><span className="font-medium text-slate-900">Zakat:</span> {donor.zakatPreference || "Not set"}</p>
                <p><span className="font-medium text-slate-900">Recurring:</span> {donor.recurringDonor ? "Yes" : "No"}</p>
                <p><span className="font-medium text-slate-900">Tax receipt:</span> {donor.taxReceiptStatus}</p>
                <p><span className="font-medium text-slate-900">Next update due:</span> {donor.nextUpdateDueDate || "Not set"}</p>
                <p><span className="font-medium text-slate-900">Reminder state:</span> {donor.effectiveReminderStatus}</p>
                <p><span className="font-medium text-slate-900">Notes:</span> {donor.notes || "No notes recorded."}</p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => { setForm(donorToForm(donor)); setEditingId(donor.id); setErrors({}); }} type="button">
                  <Pencil className="size-4" aria-hidden="true" />
                  <span className="sr-only">Edit donor</span>
                </button>
                <button className="grid size-9 place-items-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50" onClick={() => deleteDonor(donor)} type="button">
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Delete donor</span>
                </button>
              </div>
            </article>
          ))}
          {!filteredDonors.length ? <p className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">No donors match the current filters. Add a donor or reload sample data.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Field({ children, className, error, label }: { children: React.ReactNode; className?: string; error?: string; label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
