import { Clock3, LifeBuoy, ShieldCheck, WalletCards } from "lucide-react";

export const demoUser = {
  id: "demo-user",
  authUserId: "demo-auth-user",
  email: "demo@sukoon.org",
  fullName: "Ayesha Khan",
  role: "ADMIN" as const,
  title: "Operations Lead",
  avatarUrl: null,
};

export const demoDashboardData = {
  fundsDeployedPercent: 39,
  stats: [
    {
      label: "Bank Balance",
      value: "$428,950",
      change: "4 active",
      detail: "Connected charity accounts",
      icon: "bank",
    },
    {
      label: "Total Donations",
      value: "$186,420",
      change: "This month",
      detail: "Received donations",
      icon: "donations",
    },
    {
      label: "Total Expenses",
      value: "$72,840",
      change: "This month",
      detail: "Approved and paid",
      icon: "expenses",
    },
    {
      label: "Active Projects",
      value: "18",
      change: "Live",
      detail: "Currently active",
      icon: "projects",
    },
  ],
  donationTrend: [
    { label: "Jan", value: 56 },
    { label: "Feb", value: 64 },
    { label: "Mar", value: 48 },
    { label: "Apr", value: 78 },
    { label: "May", value: 69 },
    { label: "Jun", value: 86 },
    { label: "Jul", value: 92 },
  ],
  expenseBreakdown: [
    { label: "Food Relief", value: 38, color: "bg-emerald-600" },
    { label: "Medical Aid", value: 24, color: "bg-teal-500" },
    { label: "Education", value: 18, color: "bg-lime-500" },
    { label: "Operations", value: 12, color: "bg-slate-500" },
    { label: "Emergency", value: 8, color: "bg-amber-500" },
  ],
  recentActivity: [
    {
      id: "activity-1",
      type: "DONATION",
      title: "Donation received from Al Noor Group",
      description: "$12,500 allocated to winter relief",
      time: "Today",
    },
    {
      id: "activity-2",
      type: "PROJECT",
      title: "Project milestone completed",
      description: "School supplies distribution reached 820 children",
      time: "Today",
    },
    {
      id: "activity-3",
      type: "EXPENSE",
      title: "Expense submitted for review",
      description: "Medical aid batch #MA-2041 requires approval",
      time: "Yesterday",
    },
    {
      id: "activity-4",
      type: "TRANSFER",
      title: "Transfer scheduled",
      description: "$18,000 moving to Field Operations account",
      time: "Jul 11, 2026",
    },
  ],
  todaysTasks: [
    { id: "task-1", task: "Approve emergency medical fund release", owner: "Ayesha", priority: "High" },
    { id: "task-2", task: "Call top 5 recurring donors", owner: "Hamza", priority: "Medium" },
    { id: "task-3", task: "Review orphan support project report", owner: "Mariam", priority: "Medium" },
    { id: "task-4", task: "Reconcile July food parcel expenses", owner: "Bilal", priority: "Low" },
  ],
};

export const demoProjects = [
  {
    id: "project-1",
    name: "Winter Relief 2026",
    lead: "Mariam Khan",
    budget: "$96,000",
    spent: "$58,400",
    progress: 61,
    status: "Active",
  },
  {
    id: "project-2",
    name: "Mobile Medical Camp",
    lead: "Dr. Sameer Ali",
    budget: "$42,500",
    spent: "$31,900",
    progress: 75,
    status: "Active",
  },
  {
    id: "project-3",
    name: "Orphan Education Fund",
    lead: "Ayesha Noor",
    budget: "$120,000",
    spent: "$76,200",
    progress: 64,
    status: "Review",
  },
  {
    id: "project-4",
    name: "Food Parcel Program",
    lead: "Bilal Ahmed",
    budget: "$88,000",
    spent: "$82,400",
    progress: 94,
    status: "Closing",
  },
];

export const demoDonationsPageData = {
  summary: {
    monthTotal: "$186,420",
    averageGift: "$1,840",
    recurringDonors: "312",
  },
  donations: [
    { id: "donation-1", donor: "Al Noor Group", amount: "$12,500", method: "Bank Transfer", fund: "Winter Relief", date: "Jul 11, 2026", status: "Received" },
    { id: "donation-2", donor: "Sarah Malik", amount: "$2,000", method: "Card", fund: "Medical Aid", date: "Jul 11, 2026", status: "Received" },
    { id: "donation-3", donor: "Rahman Family Trust", amount: "$25,000", method: "Cheque", fund: "Education", date: "Jul 10, 2026", status: "Processing" },
    { id: "donation-4", donor: "Green Crescent LLC", amount: "$8,750", method: "Bank Transfer", fund: "Food Relief", date: "Jul 9, 2026", status: "Received" },
  ],
};

export const demoDonorsPageData = {
  summary: [
    { value: "1,248", label: "total donors" },
    { value: "312", label: "repeat donors" },
    { value: "84", label: "major donors" },
    { value: "91%", label: "contact coverage" },
  ],
  donors: [
    { id: "donor-1", name: "Al Noor Group", type: "Corporate", lifetime: "$248,000", lastGift: "$12,500", contact: "Hassan Qureshi", health: "Strong" },
    { id: "donor-2", name: "Sarah Malik", type: "Individual", lifetime: "$38,200", lastGift: "$2,000", contact: "sarah@example.com", health: "Strong" },
    { id: "donor-3", name: "Rahman Family Trust", type: "Foundation", lifetime: "$412,000", lastGift: "$25,000", contact: "Nadia Rahman", health: "Watch" },
    { id: "donor-4", name: "Green Crescent LLC", type: "Corporate", lifetime: "$96,750", lastGift: "$8,750", contact: "Omar Siddiqui", health: "New" },
  ],
};

export const demoExpenses = [
  { id: "expense-1", vendor: "City Medical Supplies", category: "Medical Aid", amount: "$14,800", project: "Mobile Medical Camp", status: "Pending" },
  { id: "expense-2", vendor: "Bright Books Co.", category: "Education", amount: "$9,450", project: "Orphan Education Fund", status: "Approved" },
  { id: "expense-3", vendor: "Metro Logistics", category: "Transport", amount: "$4,220", project: "Food Parcel Program", status: "Paid" },
  { id: "expense-4", vendor: "Unity Packaging", category: "Food Relief", amount: "$18,600", project: "Winter Relief 2026", status: "Approved" },
];

export const demoTransfers = [
  { id: "transfer-1", from: "Main Donations", to: "Field Operations", amount: "$18,000", date: "Jul 12, 2026", status: "Scheduled" },
  { id: "transfer-2", from: "Zakat Fund", to: "Medical Aid", amount: "$22,500", date: "Jul 10, 2026", status: "Completed" },
  { id: "transfer-3", from: "Education Fund", to: "School Supplies", amount: "$15,000", date: "Jul 8, 2026", status: "Completed" },
  { id: "transfer-4", from: "Emergency Reserve", to: "Flood Response", amount: "$40,000", date: "Jul 7, 2026", status: "Review" },
];

export const demoReports = [
  { id: "report-1", name: "Monthly Donation Summary", owner: "Finance", updated: "Today", status: "Ready", description: "Donations by fund, method, and donor segment." },
  { id: "report-2", name: "Project Impact Dashboard", owner: "Programs", updated: "Yesterday", status: "Draft", description: "Delivery progress and beneficiary reach." },
  { id: "report-3", name: "Expense Approval Register", owner: "Operations", updated: "Jul 9, 2026", status: "Ready", description: "Pending, approved, and paid expenses." },
  { id: "report-4", name: "Donor Retention Analysis", owner: "CRM", updated: "Jul 8, 2026", status: "Review", description: "Repeat giving and stewardship opportunities." },
];

export const demoSettingsSections = [
  { id: "setting-1", title: "Organization Profile", description: "Legal name, region, operating currency, and public identity.", key: "organization.profile", isSecret: false, icon: LifeBuoy },
  { id: "setting-2", title: "Security & Access", description: "Roles, permissions, sessions, and account protection policies.", key: "security.access", isSecret: false, icon: ShieldCheck },
  { id: "setting-3", title: "Finance Accounts", description: "Bank accounts, funds, approval rules, and transfer limits.", key: "finance.accounts", isSecret: true, icon: WalletCards },
  { id: "setting-4", title: "Workflow Preferences", description: "Project stages, donation tags, expense categories, and task rules.", key: "workflow.preferences", isSecret: false, icon: Clock3 },
];
