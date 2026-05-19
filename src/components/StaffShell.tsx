import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, ClipboardList, Users, UserPlus, Stethoscope, LogOut } from "lucide-react";

const items = [
  { title: "Home Dashboard", url: "/staff/dashboard", icon: LayoutDashboard },
  { title: "Patient Census", url: "/patient/census", icon: ClipboardList },
  { title: "Staff Management", url: "/staff/manage", icon: Users },
  { title: "Admit Patient", url: "/staff/admit", icon: UserPlus },
];

function NavSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { displayName, roles, signOut } = useAuth();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Stethoscope className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">PatientTracker</p>
            <p className="truncate text-[11px] text-muted-foreground capitalize">
              {roles.join(", ") || "staff"}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clinical</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium">{displayName || "Clinician"}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function StaffShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <NavSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur">
            <SidebarTrigger />
            {title && (
              <h1 className="font-heading text-sm font-semibold tracking-tight">{title}</h1>
            )}
          </header>
          <main className="flex-1 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
