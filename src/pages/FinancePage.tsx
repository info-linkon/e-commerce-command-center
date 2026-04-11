import ExpensesPage from "./ExpensesPage";

const FinancePage = () => {
  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">כספים</h1>
      <ExpensesPage embedded />
    </div>
  );
};

export default FinancePage;
