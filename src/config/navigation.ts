import {
  ArrowRightLeft,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  HandCoins,
  LayoutDashboard,
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
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];
