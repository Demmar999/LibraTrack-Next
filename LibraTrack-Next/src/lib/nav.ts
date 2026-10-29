/* Sidebar menus for each role (plain data, so both server and browser code can use it). */
import type { Role } from "./types";

export type IconName = "dashboard" | "resources" | "borrowing" | "members" | "reports" | "settings" | "search" | "profile";

export interface NavLink {
  kind: "link";
  href: string;
  label: string;
  icon: IconName;
  /** show the search box in the top bar on this page */
  search?: boolean;
}
export interface NavLabel {
  kind: "label";
  label: string;
}
export type NavEntry = NavLink | NavLabel;

export interface RoleNav {
  roleLabel: string;
  items: NavEntry[];
  bottom: NavLink;
  /** where the top bar search goes */
  searchPath: string;
}

export const NAV: Record<Role, RoleNav> = {
  admin: {
    roleLabel: "Admin (Librarian)",
    searchPath: "/admin/resources",
    items: [
      { kind: "link", href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", search: true },
      { kind: "label", label: "Library" },
      { kind: "link", href: "/admin/resources", label: "Resources", icon: "resources", search: true },
      { kind: "link", href: "/admin/borrowing", label: "Borrowing", icon: "borrowing" },
      { kind: "link", href: "/admin/members", label: "Members", icon: "members" },
      { kind: "label", label: "Insights" },
      { kind: "link", href: "/admin/reports", label: "Reports", icon: "reports" },
    ],
    bottom: { kind: "link", href: "/admin/settings", label: "Settings", icon: "settings" },
  },
  member: {
    roleLabel: "Library Member",
    searchPath: "/member/search",
    items: [
      { kind: "link", href: "/member/dashboard", label: "My Dashboard", icon: "dashboard", search: true },
      { kind: "label", label: "Library" },
      { kind: "link", href: "/member/search", label: "Search Books", icon: "search", search: true },
      { kind: "link", href: "/member/borrowings", label: "My Borrowings", icon: "borrowing" },
    ],
    bottom: { kind: "link", href: "/member/profile", label: "Profile", icon: "profile" },
  },
};

/** Where each role lands after login. */
export const HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  member: "/member/dashboard",
};
