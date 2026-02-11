import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RecentActivity = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>פעולות אחרונות</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          אין פעולות אחרונות להציג
        </p>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
