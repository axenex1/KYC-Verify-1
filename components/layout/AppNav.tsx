import Link from "next/link";
import { LayoutDashboard, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppNavProps {
  active?: "home" | "dashboard";
}

export function AppNav({ active }: AppNavProps) {
  const links = [
    { href: "/", label: "Capture", icon: Camera, id: "home" as const },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" as const },
  ];

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
        <span className="mr-4 py-3 text-sm font-semibold tracking-tight">
          KYC-Verify
        </span>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = active === link.id;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
