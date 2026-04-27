export type RevenueData = {
  totalRevenue: number;
  totalTransactions: number;
  monthlyRevenue: number;
  monthlyTransactions: number;
  recentPayments: {
    id: string;
    studentName: string | null;
    studentEmail: string | null;
    amount: number;
    status: string;
    couponCode: string | null;
    createdAt: string;
  }[];
  monthlyTrend: {
    month: string;
    count: number;
  }[];
};
