import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useIsOwner } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Users, Trash2, ShieldCheck } from "lucide-react";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
};

type RoleRow = {
  user_id: string;
  role: "admin" | "user";
};

const UsersPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { isOwner, isLoading: ownerLoading } = useIsOwner();
  const canManage = isAdmin || isOwner;
  const roleLoading = adminLoading || ownerLoading;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    enabled: canManage,
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, display_name, phone, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("user_roles").select("user_id, role"),
        ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      const roleMap = new Map<string, Set<"admin" | "user">>();
      (roles as RoleRow[] | null)?.forEach((r) => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
        roleMap.get(r.user_id)!.add(r.role);
      });

      return ((profiles as ProfileRow[] | null) ?? []).map((p) => ({
        ...p,
        roles: Array.from(roleMap.get(p.user_id) ?? []),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          username,
          password,
          display_name: displayName || undefined,
          phone: phone || undefined,
          role,
        },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message;
        throw new Error(msg);
      }
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("המשתמש נוצר בהצלחה");
      setUsername("");
      setPassword("");
      setDisplayName("");
      setPhone("");
      setRole("user");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error(`שגיאה ביצירת משתמש: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message;
        throw new Error(msg);
      }
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("המשתמש נמחק");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error(`שגיאה במחיקת משתמש: ${err.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("יש להזין שם משתמש וסיסמה");
      return;
    }
    if (password.length < 8) {
      toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (!/^[a-z0-9_.-]{2,32}$/.test(username)) {
      toast.error("שם משתמש חייב להכיל רק אותיות לטיניות קטנות, ספרות ו- . _ -");
      return;
    }
    createMutation.mutate();
  };

  if (roleLoading) {
    return <div className="text-muted-foreground">טוען...</div>;
  }

  if (!canManage) {
    return (
      <div className="space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          ניהול משתמשים
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              הגישה מוגבלת למנהלים ולבעלים בלבד.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6" />
        ניהול משתמשים
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            יצירת משתמש חדש
          </CardTitle>
          <CardDescription>
            המשתמש יוכל להתחבר עם שם המשתמש והסיסמה שנקבעו כאן.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-username">שם משתמש</Label>
              <Input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                dir="ltr"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">סיסמה</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="לפחות 8 תווים"
                dir="ltr"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-display">שם להצגה</Label>
              <Input
                id="new-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="שם מלא"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-phone">טלפון (לא חובה)</Label>
              <Input
                id="new-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05X-XXXXXXX"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-role">תפקיד</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">משתמש רגיל</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "יוצר..." : "צור משתמש"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">משתמשים קיימים</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <p className="text-muted-foreground">טוען...</p>
          ) : usersQuery.error ? (
            <p className="text-destructive">שגיאה בטעינת משתמשים</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם להצגה</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>תפקידים</TableHead>
                  <TableHead>נוצר</TableHead>
                  <TableHead className="w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQuery.data ?? []).map((u) => {
                  const isSelf = u.user_id === user?.id;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">
                        {u.display_name || "—"}
                        {isSelf && (
                          <Badge variant="outline" className="mr-2">
                            את/ה
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.includes("admin") && (
                            <Badge className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              מנהל
                            </Badge>
                          )}
                          {u.roles.includes("user") && !u.roles.includes("admin") && (
                            <Badge variant="secondary">משתמש</Badge>
                          )}
                          {u.roles.length === 0 && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSelf || deleteMutation.isPending}
                              title={isSelf ? "לא ניתן למחוק את עצמך" : "מחק משתמש"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>למחוק את המשתמש?</AlertDialogTitle>
                              <AlertDialogDescription>
                                פעולה זו תמחק לצמיתות את המשתמש "{u.display_name}".
                                לא ניתן לבטל פעולה זו.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ביטול</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(u.user_id)}
                              >
                                מחק
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {usersQuery.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      אין משתמשים להצגה
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
