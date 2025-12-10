import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { updatePassword, session } = useSupabaseAuth();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user came from a valid reset link (they should have a session)
  useEffect(() => {
    // Give time for authentication service to process the reset token from URL
    const timer = setTimeout(() => {
      if (!session) {
        setError("Invalid or expired reset link. Please request a new password reset.");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await updatePassword(password);
      
      if (updateError) {
        setError(updateError.message || "Failed to update password");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success("Password updated successfully!");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI4MzgiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNiA2aC00djJoNHYtMnptMC02aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
      
      <Card className="w-full max-w-md relative z-10 bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 overflow-hidden shadow-[0_0_20px_rgba(0,255,240,0.2)]">
              <img 
                src="/images/logo.jpg" 
                alt="NextDoor Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              Set New Password
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Enter your new password below
            </CardDescription>
          </div>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-4">
            <Alert className="bg-green-900/50 border-green-800 text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your password has been updated successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
            
            <Link href="/login">
              <Button 
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              >
                Go to Login
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                    disabled={isSubmitting}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold h-11 shadow-lg shadow-cyan-500/20"
                disabled={isSubmitting || !session}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>

              <Link href="/login">
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                >
                  Cancel
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} NextDoor Exterior Solutions</p>
      </div>
    </div>
  );
}
