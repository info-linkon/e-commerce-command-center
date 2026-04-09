import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.webp";

const Auth = () => {
  const { user, loading, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">טוען...</div>
      </div>
    );
  }

  if (user) return <Navigate to="/crm/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const email = `${username}@elwejha.app`;
    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "שגיאה",
        description: "שם משתמש או סיסמה לא נכונים",
        variant: "destructive",
      });
    }

    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted to-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-primary/20">
        <CardHeader className="text-center pb-2">
          <img src={logo} alt="Elwejha Logo" className="w-28 h-28 mx-auto rounded-full shadow-lg" />
          <h1 className="text-xl font-bold mt-3 text-foreground">מערכת ניהול</h1>
          <p className="text-sm text-muted-foreground">הכנס את פרטי ההתחברות שלך</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">שם משתמש</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="הכנס שם משתמש"
                required
                dir="ltr"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "מתחבר..." : "התחבר"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
