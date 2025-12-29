import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Award, Plus, Trash2, Users } from "lucide-react";

// Predefined badge templates
const BADGE_TEMPLATES = [
  { id: "top_performer", name: "Top Performer", emoji: "🏆", color: "#FFD700" },
  { id: "team_player", name: "Team Player", emoji: "🤝", color: "#4A90E2" },
  { id: "innovator", name: "Innovator", emoji: "💡", color: "#9B59B6" },
  { id: "mentor", name: "Mentor", emoji: "🎓", color: "#E67E22" },
  { id: "problem_solver", name: "Problem Solver", emoji: "🔧", color: "#16A085" },
  { id: "customer_champion", name: "Customer Champion", emoji: "⭐", color: "#E74C3C" },
  { id: "safety_first", name: "Safety First", emoji: "🛡️", color: "#27AE60" },
  { id: "quality_expert", name: "Quality Expert", emoji: "✨", color: "#8E44AD" },
  { id: "speed_demon", name: "Speed Demon", emoji: "⚡", color: "#F39C12" },
  { id: "veteran", name: "Veteran", emoji: "🎖️", color: "#34495E" },
];

interface User {
  id: number;
  name: string | null;
  email: string | null;
  image: string | null;
  nickname: string | null;
  badges: any[] | null;
  role: string;
}

export function BadgeManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [customBadge, setCustomBadge] = useState({
    name: "",
    emoji: "",
    color: "#00d4aa",
  });

  const { data: users = [] } = trpc.users.getTeam.useQuery();
  const utils = trpc.useUtils();

  const assignBadge = trpc.users.assignBadge.useMutation({
    onSuccess: () => {
      toast.success("Badge assigned successfully");
      utils.users.invalidate();
      setIsAssignDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign badge");
    },
  });

  const removeBadge = trpc.users.removeBadge.useMutation({
    onSuccess: () => {
      toast.success("Badge removed successfully");
      utils.users.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove badge");
    },
  });

  const handleAssignBadge = (badge: { id: string; name: string; emoji: string; color: string }) => {
    if (!selectedUser) return;
    assignBadge.mutate({
      userId: selectedUser.id,
      badge,
    });
  };

  const handleAssignCustomBadge = () => {
    if (!selectedUser || !customBadge.name || !customBadge.emoji) {
      toast.error("Please fill in all badge fields");
      return;
    }
    assignBadge.mutate({
      userId: selectedUser.id,
      badge: {
        id: `custom_${Date.now()}`,
        ...customBadge,
      },
    });
    setCustomBadge({ name: "", emoji: "", color: "#00d4aa" });
  };

  const handleRemoveBadge = (userId: number, badgeId: string) => {
    removeBadge.mutate({ userId, badgeId });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5" />
            Badge Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 mb-4">
            Assign badges to team members to recognize their achievements and contributions
          </p>

          {/* User List */}
          <div className="space-y-3">
            {users.map((user: User) => {
              const userBadges = (user.badges || []) as any[];
              return (
                <Card key={user.id} className="bg-slate-700 border-slate-600">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center">
                            <span className="text-lg font-bold text-black">
                              {(user.name || user.email || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-white">
                            {user.nickname || user.name || user.email}
                          </p>
                          <p className="text-sm text-slate-400 capitalize">
                            {user.role.replace("_", " ")}
                          </p>
                          {userBadges.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {userBadges.map((badge: any) => (
                                <div
                                  key={badge.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                                  style={{
                                    backgroundColor: `${badge.color}20`,
                                    color: badge.color,
                                    borderColor: `${badge.color}50`,
                                  }}
                                >
                                  <span>{badge.emoji}</span>
                                  <span>{badge.name}</span>
                                  <button
                                    onClick={() => handleRemoveBadge(user.id, badge.id)}
                                    className="ml-1 hover:opacity-70"
                                    disabled={removeBadge.isPending}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Dialog open={isAssignDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        setIsAssignDialogOpen(open);
                        if (open) setSelectedUser(user);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Badge
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-white">
                              Assign Badge to {user.nickname || user.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Badge Templates */}
                            <div>
                              <h3 className="text-sm font-semibold text-white mb-3">
                                Select a Badge
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                {BADGE_TEMPLATES.map((badge) => (
                                  <button
                                    key={badge.id}
                                    onClick={() => handleAssignBadge(badge)}
                                    disabled={assignBadge.isPending}
                                    className="p-3 rounded-lg border-2 border-slate-600 bg-slate-700 hover:border-[#00d4aa] transition-all text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">{badge.emoji}</span>
                                      <div>
                                        <p className="font-semibold text-white text-sm">
                                          {badge.name}
                                        </p>
                                        <div
                                          className="w-12 h-2 rounded-full mt-1"
                                          style={{ backgroundColor: badge.color }}
                                        />
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Custom Badge */}
                            <div>
                              <h3 className="text-sm font-semibold text-white mb-3">
                                Or Create Custom Badge
                              </h3>
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="badge-name" className="text-slate-300">
                                    Badge Name
                                  </Label>
                                  <Input
                                    id="badge-name"
                                    value={customBadge.name}
                                    onChange={(e) =>
                                      setCustomBadge({ ...customBadge, name: e.target.value })
                                    }
                                    placeholder="e.g., Rising Star"
                                    className="bg-slate-700 border-slate-600 text-white"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="badge-emoji" className="text-slate-300">
                                    Emoji
                                  </Label>
                                  <Input
                                    id="badge-emoji"
                                    value={customBadge.emoji}
                                    onChange={(e) =>
                                      setCustomBadge({ ...customBadge, emoji: e.target.value })
                                    }
                                    placeholder="🌟"
                                    maxLength={2}
                                    className="bg-slate-700 border-slate-600 text-white"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="badge-color" className="text-slate-300">
                                    Color
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="badge-color"
                                      type="color"
                                      value={customBadge.color}
                                      onChange={(e) =>
                                        setCustomBadge({ ...customBadge, color: e.target.value })
                                      }
                                      className="w-20 h-10 bg-slate-700 border-slate-600"
                                    />
                                    <Input
                                      type="text"
                                      value={customBadge.color}
                                      onChange={(e) =>
                                        setCustomBadge({ ...customBadge, color: e.target.value })
                                      }
                                      placeholder="#00d4aa"
                                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={handleAssignCustomBadge}
                                  disabled={assignBadge.isPending}
                                  className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black"
                                >
                                  {assignBadge.isPending ? "Assigning..." : "Assign Custom Badge"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
