import {
  BookOpen, BookMarked, LayoutDashboard, Library, ArrowLeftRight, Users, FileChartColumn, Settings, Search, CircleUser,
  LogOut, Menu, X, Plus, Pencil, Trash2, RotateCcw, RefreshCw, CircleCheck, TriangleAlert, Info, Clock, Wallet,
  Download, FileText, FileSpreadsheet, Bell, ChevronRight, UserPlus, Ban, Eye, EyeOff, BookCheck, CalendarClock, HandCoins,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  logo: BookOpen, dashboard: LayoutDashboard, resources: Library, borrowing: ArrowLeftRight, members: Users,
  reports: FileChartColumn, settings: Settings, search: Search, profile: CircleUser, logout: LogOut, menu: Menu, close: X,
  add: Plus, edit: Pencil, delete: Trash2, return: RotateCcw, renew: RefreshCw, success: CircleCheck, warning: TriangleAlert,
  info: Info, clock: Clock, wallet: Wallet, download: Download, pdf: FileText, excel: FileSpreadsheet, bell: Bell,
  next: ChevronRight, addUser: UserPlus, block: Ban, show: Eye, hide: EyeOff, reserve: BookMarked, borrowed: BookCheck,
  overdue: CalendarClock, fine: HandCoins,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

export function Icon({ name, size = 18, className }: { name: IconKey; size?: number; className?: string }) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={className} aria-hidden="true" />;
}
