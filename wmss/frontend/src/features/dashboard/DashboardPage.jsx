import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { BarChart3, Boxes, ClipboardList, Truck, TrendingUp, TrendingDown, AlertTriangle, Clock, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiClient } from '../../services/apiClient.js';
import { formatCurrency } from '../../utils/formatters.js';
import { useAuth } from '../../app/auth-context.jsx';
import { useSocket } from '../../app/socket-context.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const socket = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient('/reports/overview');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      // If fails, we display zeros or separate error state, 
      // but let's just proceed with null safe
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (payload) => {
      // Refresh if dashboard or specific counters might have changed
      if (['dashboard', 'receipt', 'delivery', 'incident'].includes(payload.resource)) {
        fetchData();
      }
    };
    socket.on('resource_update', handleUpdate);
    return () => socket.off('resource_update', handleUpdate);
  }, [socket, fetchData]);

  const metrics = useMemo(() => {
    if (!data) return {
      totalInventoryValue: 0,
      pendingReceipts: 0,
      pendingDeliveries: 0,
      openIncidents: 0,
      revenueChart: [],
      inventoryStatus: []
    };
    return {
      totalInventoryValue: data.totalInventoryValue || 0,
      pendingReceipts: data.counts?.pendingReceipts || 0,
      pendingDeliveries: data.counts?.pendingDeliveries || 0,
      openIncidents: data.counts?.openIncidents || 0,
      expiringSoon: data.counts?.expiringSoon || 0,
      revenueChart: data.revenueChart || [],
      inventoryStatus: data.inventoryStatus || [],
      abcAnalysis: data.abcAnalysis || [],
      predictiveInsights: data.predictiveInsights || []
    };
  }, [data]);



  // ... (existing imports)

  // ... (in DashboardPage component)
  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in">
        {/* Welcome Banner Skeleton */}
        <Skeleton className="h-48 w-full rounded-3xl" />

        {/* KPI Cards Skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[400px] rounded-2xl lg:col-span-2 xl:col-span-2" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-8 shadow-2xl shadow-indigo-500/20 dark:shadow-none">
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-white transition-all">
            {t('dashboard.welcome', { name: user?.fullName ?? 'User' })}
          </h1>
          <p className="mt-2 text-indigo-100 font-medium opacity-80">
            <Trans
              i18nKey="dashboard.todayPending"
              values={{ count: metrics.pendingReceipts + metrics.pendingDeliveries }}
              components={{ 1: <span className="underline decoration-wavy" /> }}
            />
          </p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl" />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          icon={Boxes}
          label={t('dashboard.metrics.inventoryValue')}
          value={formatCurrency(metrics.totalInventoryValue)}
          trend={t('dashboard.trends.vsLastMonth')}
          trendUp={true}
          color="indigo"
        />
        <MetricCard
          icon={ClipboardList}
          label={t('dashboard.metrics.pendingReceipts')}
          value={metrics.pendingReceipts}
          trend={t('dashboard.trends.priority')}
          trendUp={true}
          color="blue"
        />
        <MetricCard
          icon={Truck}
          label={t('dashboard.metrics.pendingDeliveries')}
          value={metrics.pendingDeliveries}
          trend={t('dashboard.trends.today')}
          trendUp={false}
          color="rose"
        />
        <MetricCard
          icon={AlertTriangle}
          label={t('dashboard.metrics.openIncidents')}
          value={metrics.openIncidents}
          trend={t('dashboard.trends.urgent')}
          trendUp={false}
          color="danger"
        />
        <MetricCard
          icon={Clock}
          label={t('dashboard.metrics.expiringSoon')}
          value={metrics.expiringSoon}
          trend={t('dashboard.trends.lessThan30Days')}
          trendUp={false}
          color="warning"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {/* Revenue Chart */}
        <div className="card lg:col-span-2 xl:col-span-2 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('dashboard.performance')}
              </h2>
              <p className="text-sm text-slate-500">{t('dashboard.revenueCostLast6Months')}</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            {metrics.revenueChart && metrics.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <AreaChart data={metrics.revenueChart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
                            <p className="mb-2 font-bold text-slate-900 dark:text-white">{label}</p>
                            {payload.map((p, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="text-slate-500">{p.name}:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(p.value)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="income" name={t('dashboard.revenue')} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name={t('dashboard.expense')} stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <p>{t('dashboard.noData', 'No revenue data')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Status Pie Chart */}
        <div className="card p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dashboard.inventoryStatus')}</h2>
            <p className="text-sm text-slate-500">{t('dashboard.allocationRatio')}</p>
          </div>
          <div className="h-[350px] w-full flex items-center justify-center">
            {metrics.inventoryStatus && metrics.inventoryStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={metrics.inventoryStatus}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={105}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics.inventoryStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e'][index % 4]} cornerRadius={8} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <p>{t('dashboard.noData', 'No inventory data')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Predictive Insights Section */}
      {metrics.predictiveInsights?.length > 0 && (
        <div className="card relative overflow-hidden border-none bg-indigo-50/50 p-8 dark:bg-indigo-500/5">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                  {t('dashboard.aiInsights')}
                </h2>
                <p className="text-sm text-slate-500 italic">{t('dashboard.aiDescription')}</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {metrics.predictiveInsights.map((item, idx) => (
                <div key={idx} className="group relative rounded-[2rem] border border-white/50 bg-white/40 p-6 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/40">
                  <div className="mb-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white leading-tight">{item.name}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{item.sku}</p>
                    </div>
                  </div>
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{t('dashboard.stockoutChance')}</span>
                      <span className="font-bold text-rose-500">{t('dashboard.inDays', { days: item.daysLeft })}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.max(100 - (item.daysLeft * 10), 10)}%` }} />
                    </div>
                  </div>
                  <button className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 hover:shadow-indigo-500/40">
                    {t('dashboard.planRestock')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, trendUp, color }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    blue: 'from-blue-500 to-blue-600',
    rose: 'from-rose-500 to-rose-600',
    danger: 'from-rose-500 to-rose-600',
    warning: 'from-amber-400 to-amber-500',
  };

  const iconBgMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600',
    blue: 'bg-blue-500/10 text-blue-600',
    rose: 'bg-rose-500/10 text-rose-600',
    danger: 'bg-rose-500/10 text-rose-600',
    warning: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <div className="group card relative overflow-hidden p-6 hover:-translate-y-1">
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgMap[color] || iconBgMap.indigo} transition-transform group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trendUp ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}>
              {trend}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
        </div>
      </div>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-50 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white/5" />
    </div>
  );
}