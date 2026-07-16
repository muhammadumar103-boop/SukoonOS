"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { FormNotice } from "@/components/data-display/form-notice";
import { StatusBadge } from "@/components/data-display/status-badge";
import { defaultUsdToPkrRate, formatMoney, type Currency, type FinanceAccount } from "@/lib/finance/local-finance";
import { donorLabel } from "@/lib/local-data/donors";
import { donationImpactsBalances, validateExchangeRateInput, validatePositiveMoneyInput } from "@/lib/local-data/finance-rules";
import { activeProjectOptions, projectLabel } from "@/lib/local-data/projects";
import { moneyValues } from "@/lib/local-data/migrations";
import { loadLocalWorkspace, saveAuditedWorkspace } from "@/lib/local-data/repository";
import type { LocalDonation, LocalDonor, LocalProject, LocalWorkspace } from "@/lib/local-data/schema";
import { triggerDownload } from "@/lib/ui/downloads";
import { cn } from "@/lib/utils";

type DonationStatus = LocalDonation["status"];

const donationStatuses: DonationStatus[] = ["Pledged", "Processing", "Received", "Refunded", "Cancelled"];
const donationMethods = ["Bank Transfer", "Card", "Cheque", "Cash", "Mobile Wallet"];

type DonationForm = {
  donorId: string;
  legacyDonorName: string;
  projectId: string;
  accountId: string;
  method: string;
  date: string;
  status: DonationStatus;
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  receiptReference: string;
  notes: string;
};

type AllocationMode = "GeneralFund" | "Project";

type InlineDonorForm = {
  country: string;
  fullName: string;
  phone: string;
  whatsapp: string;
};

const emptyForm: DonationForm = {
  donorId: "",
  legacyDonorName: "",
  projectId: "",
  accountId: "main-donations-bank",
  method: donationMethods[0],
  date: new Date().toISOString().slice(0, 10),
  status: "Received",
  originalAmount: 0,
  originalCurrency: "USD",
  exchangeRate: defaultUsdToPkrRate,
  receiptReference: "",
  notes: "",
};

const emptyInlineDonorForm: InlineDonorForm = {
  country: "Pakistan",
  fullName: "",
  phone: "",
  whatsapp: "",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `donation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function donationToForm(donation: LocalDonation): DonationForm {
  return {
    donorId: donation.donorId,
    legacyDonorName: donation.donorName,
    projectId: donation.projectId,
    accountId: donation.accountId,
    method: donation.method,
    date: donation.date,
    status: donation.status,
    originalAmount: donation.originalAmount,
    originalCurrency: donation.originalCurrency,
    exchangeRate: donation.exchangeRate,
    receiptReference: donation.receiptReference,
    notes: donation.notes,
  };
}

function donationAllocationMode(donation: LocalDonation): AllocationMode {
  return donation.projectId || donation.project !== "General Fund" ? "Project" : "GeneralFund";
}

export function LocalDonationsManager() {
  const workspaceRef = useRef<LocalWorkspace | null>(null);
  const [donations, setDonations] = useState<LocalDonation[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [donors, setDonors] = useState<LocalDonor[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [form, setForm] = useState<DonationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | DonationStatus>("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("GeneralFund");
  const [donorLookup, setDonorLookup] = useState("");
  const [showInlineDonorForm, setShowInlineDonorForm] = useState(false);
  const [inlineDonorForm, setInlineDonorForm] = useState<InlineDonorForm>(emptyInlineDonorForm);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    const workspace = loadLocalWorkspace();
    workspaceRef.current = workspace;
    setDonations(workspace.donations);
    setAccounts(workspace.financeAccounts);
    setDonors(workspace.donors);
    setProjects(workspace.projects);
    const defaultDonor = workspace.donors[0];
    const defaultAccount = workspace.financeAccounts.find((account) => account.currency === emptyForm.originalCurrency);
    setForm((current) => ({
      ...current,
      donorId: defaultDonor?.id ?? current.donorId,
      accountId: defaultAccount?.id ?? "",
    }));
    setDonorLookup(defaultDonor?.fullName ?? "");
  }, []);

  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return donations.filter((donation) => {
      const displayDonor = donorLabel(donors, donation);
      const displayProject = projectLabel(projects, donation);
      const searchable = [
        displayDonor,
        displayProject,
        donation.method,
        donation.date,
        donation.status,
        donation.receiptReference,
        donation.notes,
        donation.originalCurrency,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "All" || donation.status === statusFilter) &&
        (projectFilter === "All" || displayProject === projectFilter)
      );
    });
  }, [donations, donors, projectFilter, projects, search, statusFilter]);

  const totals = useMemo(() => {
    return filteredDonations.reduce(
      (result, donation) => {
        if (!donationImpactsBalances(donation)) {
          return result;
        }

        const sign = donation.status === "Refunded" ? -1 : 1;
        result.PKR += donation.pkrAmount * sign;
        result.USD += donation.usdAmount * sign;
        return result;
      },
      { PKR: 0, USD: 0 },
    );
  }, [filteredDonations]);

  function persistDonations(
    nextDonations: LocalDonation[],
    audit: { action: string; entityId: string; metadata: Record<string, unknown> },
  ) {
    if (!workspaceRef.current) {
      return;
    }

    const savedWorkspace = saveAuditedWorkspace(
      { ...workspaceRef.current, donations: nextDonations },
      {
        entityType: "donation",
        actor: "Local Demo User",
        entityId: audit.entityId,
        action: audit.action,
        metadata: audit.metadata,
      },
    );

    workspaceRef.current = savedWorkspace;
    setDonations(savedWorkspace.donations);
  }

  function updateForm<Key extends keyof DonationForm>(key: Key, value: DonationForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCurrency(currency: Currency) {
    setForm((current) => ({
      ...current,
      originalCurrency: currency,
      accountId: accounts.find((account) => account.currency === currency)?.id ?? "",
    }));
  }

  function resetForm() {
    const firstDonor = donors[0];
    const firstAccount = accounts.find((account) => account.currency === emptyForm.originalCurrency);
    setForm({
      ...emptyForm,
      donorId: firstDonor?.id ?? "",
      accountId: firstAccount?.id ?? "",
    });
    setEditingId(null);
    setAllocationMode("GeneralFund");
    setDonorLookup(firstDonor?.fullName ?? "");
    setShowInlineDonorForm(false);
    setInlineDonorForm(emptyInlineDonorForm);
  }

  function saveDonors(
    nextDonors: LocalDonor[],
    audit: { action: string; entityId: string; metadata: Record<string, unknown> },
  ) {
    if (!workspaceRef.current) {
      return;
    }

    const savedWorkspace = saveAuditedWorkspace(
      { ...workspaceRef.current, donors: nextDonors },
      {
        entityType: "donor",
        actor: "Local Demo User",
        entityId: audit.entityId,
        action: audit.action,
        metadata: audit.metadata,
      },
    );

    workspaceRef.current = savedWorkspace;
    setDonors(savedWorkspace.donors);
  }

  function createInlineDonor() {
    const fullName = inlineDonorForm.fullName.trim();
    const country = inlineDonorForm.country.trim();
    if (!fullName) {
      setNotice({ tone: "error", message: "Add the donor name before saving an inline donor." });
      return;
    }
    if (!country) {
      setNotice({ tone: "error", message: "Add the donor country before saving an inline donor." });
      return;
    }

    const existingMatch = donors.find((donor) => donor.fullName.trim().toLowerCase() === fullName.toLowerCase());
    if (existingMatch) {
      updateForm("donorId", existingMatch.id);
      updateForm("legacyDonorName", existingMatch.fullName);
      setDonorLookup(existingMatch.fullName);
      setShowInlineDonorForm(false);
      setInlineDonorForm(emptyInlineDonorForm);
      setNotice({ tone: "success", message: `${existingMatch.fullName} is already in the donor list and is now selected.` });
      return;
    }

    const nextDonor: LocalDonor = {
      id: createId().replace("donation-", "donor-"),
      fullName,
      phone: inlineDonorForm.phone.trim(),
      whatsapp: inlineDonorForm.whatsapp.trim(),
      email: "",
      country,
      preferredContactMethod: inlineDonorForm.whatsapp.trim() ? "WhatsApp" : inlineDonorForm.phone.trim() ? "Phone" : "Email",
      donorType: "Individual",
      givingPreferences: [],
      zakatPreference: "",
      recurringDonor: false,
      notes: "Created inline from the Donations workflow.",
      taxReceiptStatus: "Pending",
      updateHistory: [],
      nextUpdateDueDate: "",
      reminderStatus: "None",
    };

    saveDonors([nextDonor, ...donors], {
      action: "created",
      entityId: nextDonor.id,
      metadata: { source: "inline-donation-form" },
    });
    updateForm("donorId", nextDonor.id);
    updateForm("legacyDonorName", nextDonor.fullName);
    setDonorLookup(nextDonor.fullName);
    setShowInlineDonorForm(false);
    setInlineDonorForm(emptyInlineDonorForm);
    setNotice({ tone: "success", message: `${nextDonor.fullName} was created and selected for this donation.` });
  }

  function selectDonor(donor: LocalDonor) {
    updateForm("donorId", donor.id);
    updateForm("legacyDonorName", donor.fullName);
    setDonorLookup(donor.fullName);
    setShowInlineDonorForm(false);
    setInlineDonorForm(emptyInlineDonorForm);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedDonor = donors.find((donor) => donor.id === form.donorId);
    const donorId = selectedDonor?.id ?? form.donorId;
    const donorName = selectedDonor?.fullName ?? form.legacyDonorName.trim();
    const selectedAccount = accounts.find((account) => account.id === form.accountId && account.currency === form.originalCurrency);
    const selectedProject = projects.find((project) => project.id === form.projectId);
    if (!donorId || !donorName || !selectedAccount || (allocationMode === "Project" && !selectedProject)) {
      setNotice({
        tone: "error",
        message: allocationMode === "Project"
          ? "Select a donor, project, and matching funding account before saving a donation."
          : "Select a donor and matching funding account before saving a donation.",
      });
      return;
    }

    const amountError = validatePositiveMoneyInput(Number(form.originalAmount));
    if (amountError) {
      setNotice({ tone: "error", message: amountError });
      return;
    }

    const exchangeRateError = validateExchangeRateInput(Number(form.exchangeRate));
    if (exchangeRateError) {
      setNotice({ tone: "error", message: exchangeRateError });
      return;
    }

    const nextDonation: LocalDonation = {
      id: editingId ?? createId(),
      donorId,
      donorName,
      projectId: allocationMode === "Project" ? selectedProject?.id ?? "" : "",
      project: allocationMode === "Project" ? selectedProject?.name ?? "General Fund" : "General Fund",
      accountId: selectedAccount.id,
      method: form.method,
      date: form.date,
      status: form.status,
      receiptReference: form.receiptReference.trim(),
      notes: form.notes.trim(),
      ...moneyValues(Number(form.originalAmount), form.originalCurrency, Number(form.exchangeRate)),
    };

    const nextDonations = editingId
      ? donations.map((donation) => (donation.id === editingId ? nextDonation : donation))
      : [nextDonation, ...donations];
    persistDonations(nextDonations, {
      action: editingId ? "updated" : "created",
      entityId: nextDonation.id,
      metadata: {
        accountId: nextDonation.accountId,
        donorId: nextDonation.donorId,
        allocationMode,
        projectId: nextDonation.projectId,
        status: nextDonation.status,
      },
    });
    setNotice({
      tone: "success",
      message: editingId ? "Donation updated in the local workspace." : "Donation saved to the local workspace.",
    });
    resetForm();
  }

  function removeDonation(donation: LocalDonation) {
    const nextStatus = donation.status === "Received" ? "Refunded" : "Cancelled";
    const actionLabel = nextStatus === "Refunded" ? "mark as refunded" : "cancel";
    const confirmed = window.confirm(`This will ${actionLabel} the donation instead of deleting it. Continue?`);
    if (!confirmed) {
      return;
    }

    persistDonations(
      donations.map((item) => (item.id === donation.id ? { ...item, status: nextStatus } : item)),
      {
        action: nextStatus === "Refunded" ? "voided" : "cancelled",
        entityId: donation.id,
        metadata: { previousStatus: donation.status, donorId: donation.donorId, projectId: donation.projectId },
      },
    );
    setNotice({
      tone: "success",
      message: nextStatus === "Refunded" ? "Donation was marked as refunded." : "Donation was cancelled in the local workspace.",
    });
    if (editingId === donation.id) {
      resetForm();
    }
  }

  function exportCsv() {
    try {
      const headers = ["Date", "Donor", "Original Amount", "Original Currency", "Exchange Rate", "PKR Value", "USD Value", "Project", "Method", "Account", "Receipt", "Status", "Notes"];
      const rows = filteredDonations.map((donation) => [
        donation.date,
        donorLabel(donors, donation),
        donation.originalAmount,
        donation.originalCurrency,
        donation.exchangeRate,
        donation.pkrAmount,
        donation.usdAmount,
        projectLabel(projects, donation),
        donation.method,
        accounts.find((account) => account.id === donation.accountId)?.name ?? donation.accountId,
        donation.receiptReference,
        donation.status,
        donation.notes,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      triggerDownload(blob, `sukoonos-donations-${new Date().toISOString().slice(0, 10)}.csv`);
      setNotice({ tone: "success", message: "Donations CSV exported." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The donations CSV could not be exported.";
      setNotice({ tone: "error", message });
    }
  }

  const availableProjects = activeProjectOptions(projects);
  const availableDonors = [...donors].sort((left, right) => left.fullName.localeCompare(right.fullName));
  const availableAccounts = accounts.filter((account) => account.currency === form.originalCurrency);
  const projectNames = Array.from(new Set(donations.map((donation) => projectLabel(projects, donation)))).sort();
  const selectedDonorMissing = Boolean(form.donorId) && !availableDonors.some((donor) => donor.id === form.donorId);
  const selectedDonor = availableDonors.find((donor) => donor.id === form.donorId);
  const donorMatches = donorLookup.trim()
    ? availableDonors.filter((donor) =>
        [donor.fullName, donor.email, donor.whatsapp, donor.phone, donor.country].join(" ").toLowerCase().includes(donorLookup.trim().toLowerCase()),
      )
    : availableDonors.slice(0, 6);
  const submitLabel = !availableAccounts.length
    ? `Create ${form.originalCurrency} account first`
    : allocationMode === "Project" && !availableProjects.length
      ? "Create a project first"
      : editingId
        ? "Save changes"
        : "Record donation";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Received PKR" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="Received USD" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="Donation records" value={String(filteredDonations.length)} />
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit donation" : "Record donation"}</h2>
        <p className="mt-1 text-sm text-slate-500">Saved locally in demo mode and reflected in the Finance Ledger.</p>
        {notice ? <div className="mt-4"><FormNotice message={notice.message} tone={notice.tone} /></div> : null}

        <form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 lg:col-span-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Donor</p>
                <p className="mt-1 text-sm text-slate-500">Pick an existing donor quickly or add a new one here without leaving Donations.</p>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                onClick={() => setShowInlineDonorForm((current) => !current)}
                type="button"
              >
                {showInlineDonorForm ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                {showInlineDonorForm ? "Close inline donor" : "New donor inline"}
              </button>
            </div>

            {selectedDonor && !showInlineDonorForm ? (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{selectedDonor.fullName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[selectedDonor.country, selectedDonor.whatsapp || selectedDonor.phone || selectedDonor.email || "No contact added yet"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    updateForm("donorId", "");
                    updateForm("legacyDonorName", "");
                    setDonorLookup("");
                  }}
                  type="button"
                >
                  Change donor
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <Field className="lg:col-span-4" label="Find donor">
                  <div className="flex h-11 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3">
                    <Search className="size-4 text-slate-400" aria-hidden="true" />
                    <input
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      onChange={(event) => setDonorLookup(event.target.value)}
                      placeholder={availableDonors.length ? "Type donor name, phone, email, or country" : "No donors yet. Create one inline."}
                      value={donorLookup}
                    />
                  </div>
                </Field>
                {selectedDonorMissing ? (
                  <p className="text-xs text-amber-700">This donation is linked to a legacy donor name. Pick a current donor or create one inline to relink it.</p>
                ) : null}
                {donorMatches.length ? (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {donorMatches.slice(0, 6).map((donor) => {
                      const active = donor.id === form.donorId;
                      return (
                        <button
                          key={donor.id}
                          className={cn(
                            "rounded-md border px-3 py-3 text-left transition",
                            active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60",
                          )}
                          onClick={() => selectDonor(donor)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{donor.fullName}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{donor.whatsapp || donor.phone || donor.email || donor.country}</p>
                            </div>
                            {active ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : donorLookup.trim() ? (
                  <p className="text-xs text-slate-500">No donor matches “{donorLookup.trim()}”. Use inline donor creation to keep moving.</p>
                ) : null}
              </div>
            )}

            {showInlineDonorForm ? (
              <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-4">
                <Field className="lg:col-span-2" label="Donor name">
                  <input
                    className={inputClass}
                    onChange={(event) => setInlineDonorForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Full donor name"
                    value={inlineDonorForm.fullName}
                  />
                </Field>
                <Field label="WhatsApp">
                  <input
                    className={inputClass}
                    onChange={(event) => setInlineDonorForm((current) => ({ ...current, whatsapp: event.target.value }))}
                    placeholder="WhatsApp"
                    value={inlineDonorForm.whatsapp}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={inputClass}
                    onChange={(event) => setInlineDonorForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Phone"
                    value={inlineDonorForm.phone}
                  />
                </Field>
                <Field label="Country">
                  <input
                    className={inputClass}
                    onChange={(event) => setInlineDonorForm((current) => ({ ...current, country: event.target.value }))}
                    placeholder="Country"
                    value={inlineDonorForm.country}
                  />
                </Field>
                <div className="flex items-end lg:col-span-3">
                  <p className="text-xs text-slate-500">This creates a minimal donor record now so staff can finish the donation quickly. Full profile details can be completed later in Donors CRM.</p>
                </div>
                <div className="flex items-end justify-end">
                  <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800" onClick={createInlineDonor} type="button">
                    Save donor
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-4">
            <p className="text-sm font-semibold text-slate-950">Allocation</p>
            <p className="mt-1 text-sm text-slate-500">Choose whether this donation stays in the General Fund or is earmarked for a specific project.</p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <button
                  className={cn(
                    "rounded-md border px-4 py-3 text-left transition",
                    allocationMode === "GeneralFund" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setAllocationMode("GeneralFund");
                    updateForm("projectId", "");
                  }}
                  type="button"
                >
                  <p className="text-sm font-semibold">General Fund</p>
                  <p className="mt-1 text-xs text-slate-500">Unrestricted giving that finance can allocate later.</p>
                </button>
                <button
                  className={cn(
                    "rounded-md border px-4 py-3 text-left transition",
                    allocationMode === "Project" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setAllocationMode("Project");
                    if (!form.projectId && availableProjects[0]) {
                      updateForm("projectId", availableProjects[0].id);
                    }
                  }}
                  type="button"
                >
                  <p className="text-sm font-semibold">Project allocation</p>
                  <p className="mt-1 text-xs text-slate-500">Earmark this donation for a named Sukoon program.</p>
                </button>
              </div>
              {allocationMode === "Project" ? (
                <Field className="w-full lg:max-w-sm" label="Project">
                  <select
                    className={inputClass}
                    disabled={!availableProjects.length}
                    onChange={(event) => updateForm("projectId", event.target.value)}
                    value={form.projectId}
                  >
                    {availableProjects.length ? (
                      availableProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Create a project first</option>
                    )}
                  </select>
                </Field>
              ) : (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 lg:min-w-64">
                  This donation will be recorded under General Fund.
                </div>
              )}
            </div>
          </div>

          <Field label="Date">
            <input className={inputClass} onChange={(event) => updateForm("date", event.target.value)} required type="date" value={form.date} />
          </Field>
          <Field label="Original amount">
            <input className={inputClass} min="0" onChange={(event) => updateForm("originalAmount", Number(event.target.value))} required step="0.01" type="number" value={form.originalAmount} />
          </Field>
          <Field label="Original currency">
            <select className={inputClass} onChange={(event) => updateCurrency(event.target.value as Currency)} value={form.originalCurrency}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Exchange rate">
            <input className={inputClass} min="0.0001" onChange={(event) => updateForm("exchangeRate", Number(event.target.value))} required step="0.0001" type="number" value={form.exchangeRate} />
            <span className="mt-1 block text-xs text-slate-500">PKR per 1 USD. Adjust for the historical rate used when the donation was received.</span>
          </Field>
          <Field label="Funding account">
            <select className={inputClass} disabled={!availableAccounts.length} onChange={(event) => updateForm("accountId", event.target.value)} value={form.accountId}>
              {availableAccounts.length ? (
                availableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))
              ) : (
                <option value="">Create a matching account first</option>
              )}
            </select>
            {!availableAccounts.length ? <span className="mt-1 block text-xs text-slate-500">Finance accounts are managed from the Finance page.</span> : null}
          </Field>
          <Field label="Method">
            <select className={inputClass} onChange={(event) => updateForm("method", event.target.value)} value={form.method}>
              {donationMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} onChange={(event) => updateForm("status", event.target.value as DonationStatus)} value={form.status}>
              {donationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Receipt reference">
            <input className={inputClass} onChange={(event) => updateForm("receiptReference", event.target.value)} placeholder="Receipt no." value={form.receiptReference} />
          </Field>
          <Field className="lg:col-span-2" label="Notes">
            <input className={inputClass} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Allocation or stewardship notes" value={form.notes} />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
            <button
              className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              disabled={!form.donorId || !availableAccounts.length || (allocationMode === "Project" && !availableProjects.length)}
            >
              {submitLabel}
            </button>
            {editingId ? (
              <button className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={resetForm} type="button">
                Cancel edit
              </button>
            ) : null}
            <Link className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/donors">
              Open Donors CRM
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid gap-3 border-b border-emerald-100 p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search donor, project, method, receipt..." value={search} />
          </div>
          <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as "All" | DonationStatus)} value={statusFilter}>
            <option value="All">All statuses</option>
            {donationStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="All">All projects</option>
            {projectNames.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <button className="flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={exportCsv} type="button">
            <Download className="size-4" aria-hidden="true" />
            CSV
          </button>
        </div>

        <div className="table-scroll">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Donor</th>
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 text-right font-semibold">Original</th>
                <th className="px-5 py-3 text-right font-semibold">PKR value</th>
                <th className="px-5 py-3 text-right font-semibold">USD value</th>
                <th className="px-5 py-3 font-semibold">Receipt</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.map((donation) => (
                <tr key={donation.id} className="align-top">
                  <td className="px-5 py-4 text-slate-500">{donation.date}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{donorLabel(donors, donation)}</p>
                    <p className="mt-1 text-xs text-slate-500">{donation.method}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{projectLabel(projects, donation)}</td>
                  <td className="px-5 py-4 text-slate-500">{accounts.find((account) => account.id === donation.accountId)?.name ?? "Not set"}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">{formatMoney(donation.originalAmount, donation.originalCurrency)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-700">{formatMoney(donation.pkrAmount, "PKR")}</td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-700">{formatMoney(donation.usdAmount, "USD")}</td>
                  <td className="px-5 py-4 text-slate-500">{donation.receiptReference || "None"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge value={donation.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                        onClick={() => {
                          setForm(donationToForm(donation));
                          setEditingId(donation.id);
                          setAllocationMode(donationAllocationMode(donation));
                          setDonorLookup(donorLabel(donors, donation));
                          setShowInlineDonorForm(false);
                        }}
                        type="button"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Edit donation</span>
                      </button>
                      <button className="grid size-9 place-items-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50" onClick={() => removeDonation(donation)} type="button">
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Cancel or refund donation</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredDonations.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={10}>
                    No donations match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
