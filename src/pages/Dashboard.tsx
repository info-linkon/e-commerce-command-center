import StatsCards from "@/components/dashboard/StatsCards";
import SalesChart from "@/components/dashboard/SalesChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import LowStockAlerts from "@/components/dashboard/LowStockAlerts";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">דשבורד</h1>
      <StatsCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart />
        <div className="space-y-6">
          <RecentActivity />
          <LowStockAlerts />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
