import { Link, useLocation } from "wouter";
import { User, Building2, Settings, ChevronLeft } from "lucide-react";
import CRMLayout from "@/components/crm/CRMLayout";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const settingsNav = [
  {
    label: "My Profile",
    href: "/settings/profile",
    icon: User,
    description: "Manage your personal information and password",
  },
  {
    label: "Company Settings",
    href: "/settings/company",
    icon: Building2,
    description: "Business info, logo, and supplier defaults",
    ownerOnly: true,
  },
  {
    label: "General",
    href: "/settings",
    icon: Settings,
    description: "Theme, notifications, and preferences",
  },
];

export default function SettingsLayout({ children, title, description }: SettingsLayoutProps) {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/settings") {
      return location === "/settings" || location === "/settings/general";
    }
    return location === href;
  };

  return (
    <CRMLayout>
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/crm">
                <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                {description && (
                  <p className="text-slate-400 text-sm mt-1">{description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 flex-shrink-0">
              <nav className="space-y-1">
                {settingsNav.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                        isActive(item.href)
                          ? "bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
