import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  FileText,
  Settings,
  ChevronDown,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { AIChatWidget } from "@/components/shared/AIChatWidget";

interface CRMLayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  name: string | null;
  email: string | null;
  role: string | null;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/crm",
    icon: LayoutDashboard,
  },
  {
    label: "Jobs",
    icon: Briefcase,
    children: [
      { label: "All Jobs", href: "/crm/leads" },
      { label: "Pipeline", href: "/crm/pipeline" },
      { label: "New Job", href: "/crm/leads?new=true" },
    ],
  },
  {
    label: "Contacts",
    icon: Users,
    children: [
      { label: "All Contacts", href: "/crm/leads" },
      { label: "Add Contact", href: "/crm/leads?new=true" },
    ],
  },
  {
    label: "Team",
    href: "/crm/team",
    icon: Users,
  },
  {
    label: "Calendar",
    href: "/crm/calendar",
    icon: Calendar,
  },
  {
    label: "Reports",
    href: "/crm/reports",
    icon: FileText,
  },
];

export default function CRMLayout({ children }: CRMLayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const queryClient = useQueryClient();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Fetch user profile from Supabase users table
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!supabase) return;
      
      try {
        // Get current Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        // Query the users table by open_id (which matches Supabase user.id)
        const { data, error } = await supabase
          .from('users')
          .select('name, email, role')
          .eq('open_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to session email
          setUserProfile({
            name: null,
            email: session.user.email || null,
            role: null
          });
          return;
        }

        setUserProfile(data);
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      // 1. Sign out from Supabase first
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      // 2. Clear server session cookie
      try {
        await logoutMutation.mutateAsync();
      } catch (e) {
        // Ignore server errors, we're logging out anyway
      }
      
      // 3. Clear React Query cache
      queryClient.clear();
      
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // 4. Force redirect to root (which contains login form)
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/crm") return location === "/crm";
    return location.startsWith(href);
  };

  // Display name: prefer name, fallback to email
  const displayName = userProfile?.name || userProfile?.email || "User";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const displayRole = userProfile?.role ? userProfile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar - AccuLynx Style */}
      <header className="bg-gradient-to-r from-[#0d4f4f] to-[#0a3d3d] shadow-lg sticky top-0 z-50 w-full">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/crm" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                <span className="text-black font-bold text-sm">N</span>
              </div>
              <span className="text-white font-semibold text-lg hidden sm:block">
                NEXTDOOR<span className="text-[#00d4aa]">CRM</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) =>
                item.children ? (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-white/90 hover:text-white hover:bg-white/10 gap-1"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {item.children.map((child) => (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link href={child.href} className="cursor-pointer">
                            {child.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link key={item.href} href={item.href!}>
                    <Button
                      variant="ghost"
                      className={`text-white/90 hover:text-white hover:bg-white/10 gap-1 ${
                        isActive(item.href!) ? "bg-white/20 text-white" : ""
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* Right Side - Search, Notifications, User */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 absolute left-3 text-gray-400" />
              <Input
                type="text"
                placeholder="Search jobs, contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400"
              />
            </div>

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/10 gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                    <span className="text-black font-semibold text-sm">
                      {displayInitial}
                    </span>
                  </div>
                  <span className="hidden sm:block">{displayName}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium">{displayName}</p>
                  {displayRole && (
                    <p className="text-xs text-[#00d4aa] font-medium">{displayRole}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/company" className="cursor-pointer">
                    <Building2 className="w-4 h-4 mr-2" />
                    Company Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-[#0a3d3d] border-t border-white/10 px-4 py-3">
            <div className="flex flex-col gap-1">
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.label} className="space-y-1">
                    <div className="text-white/70 text-sm font-medium px-3 py-2">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="text-white/90 hover:bg-white/10 px-6 py-2 rounded">
                          {child.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-2 text-white/90 hover:bg-white/10 px-3 py-2 rounded ${
                        isActive(item.href!) ? "bg-white/20" : ""
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                )
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>

      {/* AI Chat Widget - Fixed in bottom-right corner */}
      <AIChatWidget />
    </div>
  );
}
