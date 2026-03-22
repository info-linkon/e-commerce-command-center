import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText } from "lucide-react";
import ExpensesPage from "./ExpensesPage";
import DocumentsPage from "./DocumentsPage";

const FinancePage = () => {
  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">כספים</h1>
      <Tabs defaultValue="expenses" dir="rtl">
        <TabsList>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            הוצאות
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            מסמכים
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <ExpensesPage embedded />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;
