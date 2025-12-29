import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Camera, Award } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  emoji: string;
  color: string;
  assignedBy: number;
  assignedAt: string;
}

interface UserProfileSettingsProps {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    image: string | null;
    nickname: string | null;
    badges: Badge[] | null;
    selectedBadge: string | null;
  };
}

export function UserProfileSettings({ user }: UserProfileSettingsProps) {
  const [nickname, setNickname] = useState(user.nickname || "");
  const [avatarUrl, setAvatarUrl] = useState(user.image || "");
  const [selectedBadge, setSelectedBadge] = useState(user.selectedBadge || "");

  const utils = trpc.useUtils();
  const updateNickname = trpc.users.updateNickname.useMutation({
    onSuccess: () => {
      toast.success("Nickname updated successfully");
      utils.users.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update nickname");
    },
  });

  const updateAvatar = trpc.users.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profile photo updated successfully");
      utils.users.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile photo");
    },
  });

  const selectBadge = trpc.users.selectBadge.useMutation({
    onSuccess: () => {
      toast.success("Badge selection updated");
      utils.users.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update badge");
    },
  });

  const handleSaveNickname = () => {
    updateNickname.mutate({ nickname: nickname || undefined });
  };

  const handleSaveAvatar = () => {
    if (!avatarUrl) {
      toast.error("Please enter a valid avatar URL");
      return;
    }
    updateAvatar.mutate({ avatarUrl });
  };

  const handleSelectBadge = (badgeId: string) => {
    setSelectedBadge(badgeId);
    selectBadge.mutate({ badgeId: badgeId || undefined });
  };

  const badges = (user.badges || []) as Badge[];

  return (
    <div className="space-y-6">
      {/* Profile Photo */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center">
                <span className="text-2xl font-bold text-black">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor="avatar" className="text-slate-300">
                Avatar URL
              </Label>
              <Input
                id="avatar"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter a URL to an image hosted online (e.g., from Imgur, Gravatar, etc.)
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveAvatar}
            disabled={updateAvatar.isPending || !avatarUrl}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
          >
            {updateAvatar.isPending ? "Saving..." : "Save Photo"}
          </Button>
        </CardContent>
      </Card>

      {/* Nickname */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Display Name
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nickname" className="text-slate-300">
              Nickname
            </Label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={user.name || "Enter a nickname"}
              maxLength={100}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              This will be displayed instead of your full name in messages
            </p>
          </div>
          <Button
            onClick={handleSaveNickname}
            disabled={updateNickname.isPending}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
          >
            {updateNickname.isPending ? "Saving..." : "Save Nickname"}
          </Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5" />
            Your Badges ({badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {badges.length > 0 ? (
            <>
              <p className="text-sm text-slate-400">
                Select which badge to display next to your name in messages
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => handleSelectBadge(badge.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedBadge === badge.id
                        ? "border-[#00d4aa] bg-[#00d4aa]/10"
                        : "border-slate-600 bg-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{badge.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{badge.name}</p>
                        <p className="text-xs text-slate-400">
                          Assigned {new Date(badge.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedBadge === badge.id && (
                        <div className="w-6 h-6 rounded-full bg-[#00d4aa] flex items-center justify-center">
                          <span className="text-black text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedBadge && (
                <Button
                  variant="outline"
                  onClick={() => handleSelectBadge("")}
                  disabled={selectBadge.isPending}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Clear Badge Selection
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No badges assigned yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Badges are assigned by the owner and will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
