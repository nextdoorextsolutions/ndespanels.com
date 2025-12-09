import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Moon, Sun, Bell, Mail, MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import SettingsLayout from "./SettingsLayout";

export default function GeneralSettings() {
  const { theme, setTheme } = useTheme();
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [jobAssignmentAlerts, setJobAssignmentAlerts] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  return (
    <SettingsLayout title="General Settings" description="Theme, notifications, and app preferences">
      <div className="space-y-8">
        {/* Theme Settings */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-[#00d4aa]" />
              ) : (
                <Sun className="w-5 h-5 text-[#00d4aa]" />
              )}
              Appearance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Customize how the app looks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-300">Dark Mode</Label>
                <p className="text-sm text-slate-500">Use dark theme for the interface</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme === "light"
                      ? "border-[#00d4aa] bg-white"
                      : "border-slate-600 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <Sun className={`w-5 h-5 ${theme === "light" ? "text-yellow-500" : "text-slate-400"}`} />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme === "dark"
                      ? "border-[#00d4aa] bg-slate-900"
                      : "border-slate-600 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <Moon className={`w-5 h-5 ${theme === "dark" ? "text-[#00d4aa]" : "text-slate-400"}`} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-slate-700" />

        {/* Notification Settings */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#00d4aa]" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-slate-400">
              Choose how you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Channels */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Notification Channels</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div>
                    <Label className="text-slate-300">Email Notifications</Label>
                    <p className="text-xs text-slate-500">Receive updates via email</p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <div>
                    <Label className="text-slate-300">SMS Notifications</Label>
                    <p className="text-xs text-slate-500">Get text messages for urgent updates</p>
                  </div>
                </div>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <div>
                    <Label className="text-slate-300">Push Notifications</Label>
                    <p className="text-xs text-slate-500">Browser push notifications</p>
                  </div>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Alert Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Alert Types</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Job Assignments</Label>
                  <p className="text-xs text-slate-500">When you're assigned to a new job</p>
                </div>
                <Switch
                  checked={jobAssignmentAlerts}
                  onCheckedChange={setJobAssignmentAlerts}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Mentions</Label>
                  <p className="text-xs text-slate-500">When someone @mentions you</p>
                </div>
                <Switch
                  checked={mentionAlerts}
                  onCheckedChange={setMentionAlerts}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Daily Digest</Label>
                  <p className="text-xs text-slate-500">Summary of daily activity</p>
                </div>
                <Switch
                  checked={dailyDigest}
                  onCheckedChange={setDailyDigest}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveNotifications}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
