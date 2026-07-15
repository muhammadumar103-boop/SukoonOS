import { accountBalanceFromLedger, buildFinanceLedger } from "@/lib/finance/ledger";
import { donorReminderStatus, donorLabel, type DonorRow, deriveDonorRows } from "@/lib/local-data/donors";
import { projectLabel } from "@/lib/local-data/projects";
import type { LocalApproval, LocalDonor, LocalTask, LocalWorkspace } from "@/lib/local-data/schema";

export type WorkflowTaskRow = {
  id: string;
  title: string;
  dueDate: string;
  priority: LocalTask["priority"];
  assignedUser: string;
  projectId: string;
  projectName: string;
  status: LocalTask["status"];
  sourceType: "Manual" | "Donor Reminder";
  sourceId: string;
  notes: string;
};

export type WorkflowApprovalRow = {
  id: string;
  sourceType: LocalApproval["sourceType"];
  sourceId: string;
  title: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requestedAt: string;
  status: LocalApproval["status"];
  notes: string;
};

const priorityRank: Record<LocalTask["priority"], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const taskStatusRank: Record<LocalTask["status"], number> = {
  Open: 0,
  "In Progress": 1,
  Blocked: 2,
  Done: 3,
};

function firstSupportedProjectId(donor: DonorRow, workspace: LocalWorkspace) {
  const supported = donor.projectsSupported[0];
  if (!supported) {
    return "";
  }

  return workspace.projects.find((project) => project.name === supported)?.id ?? "";
}

export function deriveReminderTasks(workspace: LocalWorkspace) {
  const donorRows = deriveDonorRows(workspace.donors, workspace.donations);

  return donorRows
    .filter((donor) => donor.effectiveReminderStatus === "Upcoming" || donor.effectiveReminderStatus === "Overdue")
    .map<WorkflowTaskRow>((donor) => {
      const reminderStatus = donorReminderStatus(donor);
      const projectId = firstSupportedProjectId(donor, workspace);

      return {
        id: `donor-reminder-${donor.id}`,
        title: `Send donor update to ${donor.fullName}`,
        dueDate: donor.nextUpdateDueDate,
        priority: reminderStatus === "Overdue" ? "High" : "Medium",
        assignedUser: "Donor Relations",
        projectId,
        projectName: projectId ? projectLabel(workspace.projects, { projectId }) : donor.projectsSupported[0] ?? "General stewardship",
        status: reminderStatus === "Overdue" ? "Blocked" : "Open",
        sourceType: "Donor Reminder",
        sourceId: donor.id,
        notes: donor.notes,
      };
    });
}

export function deriveTaskRows(workspace: LocalWorkspace) {
  const manualTasks = workspace.tasks
    .filter((task) => task.status !== "Done")
    .map<WorkflowTaskRow>((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      assignedUser: task.assignedUser,
      projectId: task.projectId,
      projectName: task.projectId ? projectLabel(workspace.projects, { projectId: task.projectId }) : "General Operations",
      status: task.status,
      sourceType: "Manual",
      sourceId: task.id,
      notes: "",
    }));

  return [...manualTasks, ...deriveReminderTasks(workspace)].sort((left, right) => {
    if (left.dueDate !== right.dueDate) {
      return (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");
    }

    if (left.status !== right.status) {
      return taskStatusRank[left.status] - taskStatusRank[right.status];
    }

    return priorityRank[left.priority] - priorityRank[right.priority];
  });
}

export function deriveApprovalRows(workspace: LocalWorkspace) {
  const expenseApprovals = workspace.expenses
    .filter((expense) => expense.approvalStatus === "Pending")
    .map<WorkflowApprovalRow>((expense) => ({
      id: `approval-expense-${expense.id}`,
      sourceType: "Expense",
      sourceId: expense.id,
      title: expense.description || expense.category,
      projectId: expense.projectId,
      projectName: projectLabel(workspace.projects, expense),
      requestedBy: expense.paidBy || "Operations",
      requestedAt: expense.date,
      status: "Pending",
      notes: expense.notes,
    }));

  const transferApprovals = workspace.transfers
    .filter((transfer) => transfer.status === "Review")
    .map<WorkflowApprovalRow>((transfer) => ({
      id: `approval-transfer-${transfer.id}`,
      sourceType: "Transfer",
      sourceId: transfer.id,
      title: transfer.reference || "Transfer approval",
      projectId: transfer.projectId,
      projectName: projectLabel(workspace.projects, transfer),
      requestedBy:
        workspace.financeAccounts.find((account) => account.id === transfer.fromAccountId)?.name ?? "Finance",
      requestedAt: transfer.date,
      status: "Pending",
      notes: transfer.notes,
    }));

  const projectUpdateApprovals = workspace.approvals
    .filter((approval) => approval.status === "Pending")
    .map<WorkflowApprovalRow>((approval) => ({
      id: approval.id,
      sourceType: approval.sourceType,
      sourceId: approval.sourceId,
      title:
        approval.sourceType === "Project Update"
          ? `Project update for ${projectLabel(workspace.projects, { projectId: approval.sourceId })}`
          : approval.sourceType,
      projectId: approval.sourceType === "Project Update" ? approval.sourceId : "",
      projectName: approval.sourceType === "Project Update" ? projectLabel(workspace.projects, { projectId: approval.sourceId }) : "Not linked",
      requestedBy: approval.requestedBy,
      requestedAt: approval.requestedAt,
      status: approval.status,
      notes: approval.notes,
    }));

  return [...expenseApprovals, ...transferApprovals, ...projectUpdateApprovals].sort((left, right) =>
    right.requestedAt.localeCompare(left.requestedAt),
  );
}

export function deriveAccountBalanceRows(workspace: LocalWorkspace) {
  const ledger = buildFinanceLedger(workspace);
  return workspace.financeAccounts.map((account) => ({
    ...account,
    balance: accountBalanceFromLedger(account, ledger),
  }));
}

export function donorSummaryLabel(donor: LocalDonor, workspace: LocalWorkspace) {
  return donorLabel(workspace.donors, {
    donorId: donor.id,
    donorName: donor.fullName,
  });
}
