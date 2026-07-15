"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock3, HandHeart, Landmark, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { MetricCard } from "@/components/data-display/metric-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { appendAuditLogEntry, loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import { deriveDashboardData } from "@/lib/local-data/dashboard";
import { formatMoney } from "@/lib/finance/local-finance";
import type { LocalApproval, LocalTask, LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

const metricIcons = {
  approvals: ShieldCheck,
  bank: Landmark,
  donations: HandHeart,
  expenses: ClipboardCheck,
  projects: CheckCircle2,
  tasks: Clock3,
};

type TaskFormState = {
  assignedUser: string;
  dueDate: string;
  priority: LocalTask["priority"];
  projectId: string;
  title: string;
};

type ApprovalFormState = {
  notes: string;
  projectId: string;
  requestedBy: string;
};

const emptyTaskForm: TaskFormState = {
  assignedUser: "Ayesha Khan",
  dueDate: new Date().toISOString().slice(0, 10),
  priority: "Medium",
  projectId: "",
  title: "",
};

const emptyApprovalForm: ApprovalFormState = {
  notes: "",
  projectId: "",
  requestedBy: "Ayesha Khan",
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function LocalDashboard() {
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [approvalForm, setApprovalForm] = useState<ApprovalFormState>(emptyApprovalForm);

  useEffect(() => {
    const loadedWorkspace = loadLocalWorkspace();
    const defaultProject = loadedWorkspace.projects.find((project) => !project.archivedAt);

    setWorkspace(loadedWorkspace);
    setTaskForm((current) => ({ ...current, projectId: defaultProject?.id ?? current.projectId }));
    setApprovalForm((current) => ({ ...current, projectId: defaultProject?.id ?? current.projectId }));
  }, []);

  const dashboard = useMemo(() => (workspace ? deriveDashboardData(workspace) : null), [workspace]);

  function persistWorkspace(
    nextWorkspace: LocalWorkspace,
    audit?: {
      action: string;
      entityId: string;
      entityType: string;
      metadata: Record<string, unknown>;
    },
  ) {
    const audited = audit
      ? appendAuditLogEntry(nextWorkspace, {
          actor: "Local Demo User",
          ...audit,
        })
      : nextWorkspace;

    const saved = saveLocalWorkspace(audited);
    setWorkspace(saved);
    return saved;
  }

  function updateTaskForm<Key extends keyof TaskFormState>(key: Key, value: TaskFormState[Key]) {
    setTaskForm((current) => ({ ...current, [key]: value }));
  }

  function updateApprovalForm<Key extends keyof ApprovalFormState>(key: Key, value: ApprovalFormState[Key]) {
    setApprovalForm((current) => ({ ...current, [key]: value }));
  }

  function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !taskForm.title.trim()) {
      return;
    }

    const nextTask: LocalTask = {
      id: createId("task"),
      title: taskForm.title.trim(),
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      assignedUser: taskForm.assignedUser.trim() || "Unassigned",
      projectId: taskForm.projectId,
      status: "Open",
    };

    persistWorkspace(
      {
        ...workspace,
        tasks: [nextTask, ...workspace.tasks],
      },
      {
        action: "created",
        entityId: nextTask.id,
        entityType: "task",
        metadata: { projectId: nextTask.projectId, priority: nextTask.priority },
      },
    );

    setTaskForm((current) => ({ ...emptyTaskForm, assignedUser: current.assignedUser, projectId: current.projectId, dueDate: emptyTaskForm.dueDate }));
  }

  function updateManualTask(taskId: string, nextStatus: LocalTask["status"]) {
    if (!workspace) {
      return;
    }

    persistWorkspace(
      {
        ...workspace,
        tasks: workspace.tasks.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)),
      },
      {
        action: nextStatus === "Done" ? "completed" : "updated",
        entityId: taskId,
        entityType: "task",
        metadata: { status: nextStatus },
      },
    );
  }

  function deleteManualTask(taskId: string) {
    if (!workspace) {
      return;
    }

    const confirmed = window.confirm("Delete this task from the local workspace?");
    if (!confirmed) {
      return;
    }

    persistWorkspace(
      {
        ...workspace,
        tasks: workspace.tasks.filter((task) => task.id !== taskId),
      },
      {
        action: "deleted",
        entityId: taskId,
        entityType: "task",
        metadata: {},
      },
    );
  }

  function completeDonorReminder(donorId: string) {
    if (!workspace) {
      return;
    }

    persistWorkspace(
      {
        ...workspace,
        donors: workspace.donors.map((donor) =>
          donor.id === donorId
            ? {
                ...donor,
                reminderStatus: "Completed",
                updateHistory: [
                  {
                    id: createId("donor-update"),
                    date: new Date().toISOString().slice(0, 10),
                    summary: "Reminder marked complete from the dashboard queue.",
                  },
                  ...donor.updateHistory,
                ],
              }
            : donor,
        ),
      },
      {
        action: "completed-reminder",
        entityId: donorId,
        entityType: "donor",
        metadata: {},
      },
    );
  }

  function handleCreateProjectApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !approvalForm.projectId) {
      return;
    }

    const nextApproval: LocalApproval = {
      id: createId("approval"),
      sourceType: "Project Update",
      sourceId: approvalForm.projectId,
      status: "Pending",
      requestedBy: approvalForm.requestedBy.trim() || "Local Demo User",
      requestedAt: new Date().toISOString().slice(0, 10),
      reviewedBy: "",
      reviewedAt: "",
      notes: approvalForm.notes.trim(),
    };

    persistWorkspace(
      {
        ...workspace,
        approvals: [nextApproval, ...workspace.approvals],
      },
      {
        action: "created",
        entityId: nextApproval.id,
        entityType: "approval",
        metadata: { projectId: nextApproval.sourceId, sourceType: nextApproval.sourceType },
      },
    );

    setApprovalForm((current) => ({ ...emptyApprovalForm, projectId: current.projectId, requestedBy: current.requestedBy }));
  }

  function handleApprovalDecision(sourceType: LocalApproval["sourceType"], sourceId: string, decision: "Approved" | "Rejected") {
    if (!workspace) {
      return;
    }

    if (sourceType === "Expense") {
      persistWorkspace(
        {
          ...workspace,
          expenses: workspace.expenses.map((expense) => (expense.id === sourceId ? { ...expense, approvalStatus: decision === "Approved" ? "Approved" : "Rejected" } : expense)),
        },
        {
          action: decision.toLowerCase(),
          entityId: sourceId,
          entityType: "expense",
          metadata: { decision },
        },
      );
      return;
    }

    if (sourceType === "Transfer") {
      persistWorkspace(
        {
          ...workspace,
          transfers: workspace.transfers.map((transfer) => (transfer.id === sourceId ? { ...transfer, status: decision === "Approved" ? "Completed" : "Cancelled" } : transfer)),
        },
        {
          action: decision.toLowerCase(),
          entityId: sourceId,
          entityType: "transfer",
          metadata: { decision },
        },
      );
      return;
    }

    persistWorkspace(
      {
        ...workspace,
        approvals: workspace.approvals.map((approval) =>
          approval.id === sourceId
            ? {
                ...approval,
                status: decision,
                reviewedAt: new Date().toISOString().slice(0, 10),
                reviewedBy: "Local Demo User",
              }
            : approval,
        ),
      },
      {
        action: decision.toLowerCase(),
        entityId: sourceId,
        entityType: "approval",
        metadata: { decision, sourceType },
      },
    );
  }

  if (!workspace || !dashboard) {
    return <div className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500 shadow-sm shadow-emerald-950/5">Loading dashboard...</div>;
  }

  const visibleProjects = workspace.projects.filter((project) => !project.archivedAt);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboard.stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} icon={metricIcons[stat.icon as keyof typeof metricIcons]} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Donations this month" value={`${formatMoney(dashboard.summary.donationsThisMonthPkr, "PKR")} / ${formatMoney(dashboard.summary.donationsThisMonthUsd, "USD")}`} />
        <SummaryTile label="Expenses this month" value={`${formatMoney(dashboard.summary.expensesThisMonthPkr, "PKR")} / ${formatMoney(dashboard.summary.expensesThisMonthUsd, "USD")}`} />
        <SummaryTile label="Pending approvals" value={String(dashboard.summary.pendingApprovals)} />
        <SummaryTile label="Overdue donor updates" value={String(dashboard.summary.overdueDonorUpdates)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Donation momentum</h2>
              <p className="mt-1 text-sm text-slate-500">Derived from received donations stored in this local workspace.</p>
            </div>
            <StatusBadge value="Live" />
          </div>
          <div className="mt-5">
            <BarChart data={dashboard.donationTrend} />
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Expense allocation</h2>
          <p className="mt-1 text-sm text-slate-500">Approved and paid expense mix for the current workspace.</p>
          <div className="mt-6">
            <DonutChart value={dashboard.fundsDeployedPercent} label="This month's funds deployed" />
          </div>
          <div className="mt-6 space-y-4">
            {dashboard.expenseBreakdown.length ? dashboard.expenseBreakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{item.amountLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No approved expenses recorded yet.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Account balances</h2>
              <p className="mt-1 text-sm text-slate-500">Balances are derived from workspace transactions and account openings.</p>
            </div>
            <StatusBadge value="Derived" />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dashboard.accountBalances.map((account) => (
              <article key={account.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{account.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{account.kind} · {account.currency}</p>
                  </div>
                  <StatusBadge value={account.status} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <BalanceMetric label="Opening" value={formatMoney(account.openingBalance, account.currency)} />
                  <BalanceMetric label="Current" value={formatMoney(account.balance, account.currency)} />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Project watchlist</h2>
          <div className="mt-5 space-y-4">
            {dashboard.projectRows.slice(0, 5).map((project) => (
              <div key={project.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{project.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{project.projectType} · {project.status}</p>
                  </div>
                  <StatusBadge value={project.remainingUsd < 0 || project.remainingPkr < 0 ? "At Risk" : project.status} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <BalanceMetric label="Donations" value={`${formatMoney(project.donationTotalPkr, "PKR")} / ${formatMoney(project.donationTotalUsd, "USD")}`} />
                  <BalanceMetric label="Expenses" value={`${formatMoney(project.expenseTotalPkr, "PKR")} / ${formatMoney(project.expenseTotalUsd, "USD")}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Approvals queue</h2>
              <p className="mt-1 text-sm text-slate-500">Expenses, transfers, and project update approvals derived from the local workspace.</p>
            </div>
            <StatusBadge value={dashboard.approvalRows.length ? "Pending" : "Clear"} />
          </div>

          <form className="mt-5 grid gap-3 rounded-lg border border-slate-100 p-4" onSubmit={handleCreateProjectApproval}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project">
                <select className={inputClass} onChange={(event) => updateApprovalForm("projectId", event.target.value)} value={approvalForm.projectId}>
                  {visibleProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Requested by">
                <input className={inputClass} onChange={(event) => updateApprovalForm("requestedBy", event.target.value)} value={approvalForm.requestedBy} />
              </Field>
            </div>
            <Field label="Approval notes">
              <input className={inputClass} onChange={(event) => updateApprovalForm("notes", event.target.value)} placeholder="Explain what needs review" value={approvalForm.notes} />
            </Field>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800" type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Request project approval
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {dashboard.approvalRows.length ? dashboard.approvalRows.map((approval) => (
              <article key={approval.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{approval.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{approval.sourceType} · {approval.projectName}</p>
                  </div>
                  <StatusBadge value={approval.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{approval.notes || "No notes recorded."}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Requested by {approval.requestedBy} on {approval.requestedAt}</p>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={() => handleApprovalDecision(approval.sourceType, approval.sourceType === "Project Update" ? approval.id : approval.sourceId, "Approved")} type="button">
                      Approve
                    </button>
                    <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50" onClick={() => handleApprovalDecision(approval.sourceType, approval.sourceType === "Project Update" ? approval.id : approval.sourceId, "Rejected")} type="button">
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No pending approvals right now.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Task queue</h2>
              <p className="mt-1 text-sm text-slate-500">Manual tasks plus donor reminder follow-ups.</p>
            </div>
            <StatusBadge value={dashboard.taskRows.length ? "Review" : "Clear"} />
          </div>

          <form className="mt-5 grid gap-3 rounded-lg border border-slate-100 p-4" onSubmit={handleCreateTask}>
            <Field label="Task title">
              <input className={inputClass} onChange={(event) => updateTaskForm("title", event.target.value)} placeholder="Prepare donor update pack" value={taskForm.title} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Due date">
                <input className={inputClass} onChange={(event) => updateTaskForm("dueDate", event.target.value)} type="date" value={taskForm.dueDate} />
              </Field>
              <Field label="Priority">
                <select className={inputClass} onChange={(event) => updateTaskForm("priority", event.target.value as LocalTask["priority"])} value={taskForm.priority}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assigned user">
                <input className={inputClass} onChange={(event) => updateTaskForm("assignedUser", event.target.value)} value={taskForm.assignedUser} />
              </Field>
              <Field label="Project">
                <select className={inputClass} onChange={(event) => updateTaskForm("projectId", event.target.value)} value={taskForm.projectId}>
                  <option value="">General Operations</option>
                  {visibleProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800" type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Add task
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {dashboard.taskRows.length ? dashboard.taskRows.map((task) => (
              <article key={task.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{task.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{task.projectName} · {task.assignedUser}</p>
                  </div>
                  <StatusBadge value={task.priority === "High" ? "Pending" : task.priority === "Low" ? "Draft" : "Processing"} />
                </div>
                <p className="mt-3 text-sm text-slate-600">Due {task.dueDate || "Not set"} · {task.sourceType}</p>
                {task.notes ? <p className="mt-2 text-sm text-slate-500">{task.notes}</p> : null}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {task.sourceType === "Donor Reminder" ? (
                    <button className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={() => completeDonorReminder(task.sourceId)} type="button">
                      Mark reminder complete
                    </button>
                  ) : (
                    <>
                      <button className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={() => updateManualTask(task.id, "Done")} type="button">
                        Mark done
                      </button>
                      <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50" onClick={() => deleteManualTask(task.id)} type="button">
                        <Trash2 className="mr-1 inline size-3" aria-hidden="true" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No open tasks right now.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Recent activity</h2>
          <div className="mt-5 space-y-4">
            {dashboard.recentActivity.length ? dashboard.recentActivity.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-950">{activity.title}</p>
                  <p className="text-xs text-slate-400">{activity.time}</p>
                </div>
                <p className="mt-2 text-sm text-slate-500">{activity.description}</p>
              </div>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No recent activity yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Over-budget projects</h2>
          <div className="mt-5 space-y-4">
            {dashboard.projectsOverBudget.length ? dashboard.projectsOverBudget.map((project) => (
              <div key={project.id} className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.projectType} · {project.status}</p>
                  </div>
                  <StatusBadge value="At Risk" />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Remaining: {formatMoney(project.remainingPkr, "PKR")} / {formatMoney(project.remainingUsd, "USD")}
                </p>
              </div>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No projects are currently over budget.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function BalanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
