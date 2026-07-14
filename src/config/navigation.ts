import {
  ArrowRightLeft,
  BarChart3,
  BriefcaseBusiness,
  BookOpenText,
  HandCoins,
  LayoutDashboard,
  Landmark,
  ReceiptText,
  Settings,
  UsersRound,
} from "lucide-react";

export const navigationItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: BriefcaseBusiness },
  { title: "Donations", href: "/donations", icon: HandCoins },
  { title: "Donors CRM", href: "/donors", icon: UsersRound },
  { title: "Expenses", href: "/expenses", icon: ReceiptText },
  { title: "Transfers", href: "/transfers", icon: ArrowRightLeft },
  { title: "Finance", href: "/finance", icon: Landmark },
  { title: "Finance Ledger", href: "/finance-ledger", icon: BookOpenText },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];
