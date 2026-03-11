import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import StatsCard from '@/components/dashboard/StatsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import { Users, ClipboardList, Calendar, Package, TrendingUp, Activity, Building2, AlertTriangle, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const COLORS = [
  'hsl(174, 62%, 38%)', 'hsl(36, 90%, 55%)', 'hsl(210, 80%, 55%)',
  'hsl(152, 60%, 42%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 55%)',
  'hsl(45, 85%, 50%)', 'hsl(330, 70%, 50%)',
];

export default function Reports() {
  const [stats, setStats] = useState({ totalVisits: 0, totalPatients: 0, totalAppointments: 0, lowStockItems: 0, referrals: 0, avgVisitsPerDay: 0 });
  const [statusData, setStatusData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [facultyData, setFacultyData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [topComplaints, setTopComplaints] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [period, setPeriod] = useState('6');

  useEffect(() => { loadReports(); }, [period]);

  async function loadReports() {
    const months = parseInt(period);
    const startDate = startOfMonth(subMonths(new Date(), months - 1)).toISOString();

    const [visitsRes, profilesRes, apptsRes, inventoryRes, recordsRes] = await Promise.all([
      supabase.from('visits').select('*').gte('created_at', startDate),
      supabase.from('profiles').select('*'),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('medication_inventory').select('*'),
      supabase.from('medical_records').select('is_referred, created_at').gte('created_at', startDate),
    ]);

    const visits = visitsRes.data || [];
    const profiles = profilesRes.data || [];
    const inventory = inventoryRes.data || [];
    const records = recordsRes.data || [];

    const dayCount = Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));

    setStats({
      totalVisits: visits.length,
      totalPatients: profiles.length,
      totalAppointments: apptsRes.count || 0,
      lowStockItems: inventory.filter(i => i.quantity <= i.reorder_level).length,
      referrals: records.filter(r => r.is_referred).length,
      avgVisitsPerDay: Math.round((visits.length / dayCount) * 10) / 10,
    });

    // Status breakdown
    const statusCount: Record<string, number> = {};
    visits.forEach(v => { statusCount[v.status] = (statusCount[v.status] || 0) + 1; });
    setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name: name.replace('_', ' '), value })));

    // Priority breakdown
    const priorityCount: Record<string, number> = {};
    visits.forEach(v => { const p = v.priority || 'normal'; priorityCount[p] = (priorityCount[p] || 0) + 1; });
    setPriorityData(Object.entries(priorityCount).map(([name, value]) => ({ name, value })));

    // Monthly trend
    const monthRange = eachMonthOfInterval({ start: new Date(startDate), end: new Date() });
    const monthlyVisits = monthRange.map(m => {
      const key = format(m, 'MMM yyyy');
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const count = visits.filter(v => {
        const d = parseISO(v.created_at);
        return d >= mStart && d <= mEnd;
      }).length;
      const refs = records.filter(r => {
        const d = parseISO(r.created_at);
        return d >= mStart && d <= mEnd && r.is_referred;
      }).length;
      return { month: key, visits: count, referrals: refs };
    });
    setMonthlyData(monthlyVisits);

    // Faculty breakdown
    const patientIds = [...new Set(visits.map(v => v.patient_id))];
    const facultyCount: Record<string, number> = {};
    patientIds.forEach(pid => {
      const prof = profiles.find(p => p.user_id === pid);
      const fac = prof?.faculty || 'Unknown';
      facultyCount[fac] = (facultyCount[fac] || 0) + 1;
    });
    setFacultyData(Object.entries(facultyCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

    // Gender breakdown
    const genderCount: Record<string, number> = {};
    patientIds.forEach(pid => {
      const prof = profiles.find(p => p.user_id === pid);
      const g = prof?.gender || 'Unknown';
      genderCount[g] = (genderCount[g] || 0) + 1;
    });
    setGenderData(Object.entries(genderCount).map(([name, value]) => ({ name, value })));

    // Top complaints
    const complaintCount: Record<string, number> = {};
    visits.forEach(v => {
      const c = v.chief_complaint?.toLowerCase().trim() || 'unknown';
      complaintCount[c] = (complaintCount[c] || 0) + 1;
    });
    setTopComplaints(
      Object.entries(complaintCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    );

    // Inventory alerts
    setInventoryAlerts(inventory.filter(i => i.quantity <= i.reorder_level).map(i => ({
      name: i.name, quantity: i.quantity, reorder: i.reorder_level, unit: i.unit,
      expiry: i.expiry_date,
    })));

    // Daily trend (last 30 days)
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d;
    });
    setDailyTrend(last30.map(d => {
      const dayStr = format(d, 'yyyy-MM-dd');
      const count = visits.filter(v => v.created_at.startsWith(dayStr)).length;
      return { day: format(d, 'dd MMM'), visits: count };
    }));
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive sick bay operations overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const csvRows = ['Metric,Value', `Total Visits,${stats.totalVisits}`, `Patients,${stats.totalPatients}`, `Appointments,${stats.totalAppointments}`, `Avg/Day,${stats.avgVisitsPerDay}`, `Referrals,${stats.referrals}`, `Low Stock Items,${stats.lowStockItems}`];
              if (topComplaints.length > 0) { csvRows.push('', 'Complaint,Count'); topComplaints.forEach(c => csvRows.push(`"${c.name}",${c.value}`)); }
              if (inventoryAlerts.length > 0) { csvRows.push('', 'Medication,Stock,Reorder Level,Unit'); inventoryAlerts.forEach(i => csvRows.push(`"${i.name}",${i.quantity},${i.reorder},${i.unit}`)); }
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bbuc-report-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
            }}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 1 month</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard title="Total Visits" value={stats.totalVisits} icon={ClipboardList} variant="primary" />
          <StatsCard title="Patients" value={stats.totalPatients} icon={Users} variant="success" />
          <StatsCard title="Appointments" value={stats.totalAppointments} icon={Calendar} variant="default" />
          <StatsCard title="Avg/Day" value={stats.avgVisitsPerDay} icon={TrendingUp} variant="primary" />
          <StatsCard title="Referrals" value={stats.referrals} icon={Activity} variant="warning" />
          <StatsCard title="Low Stock" value={stats.lowStockItems} icon={Package} variant={stats.lowStockItems > 0 ? 'destructive' : 'default'} />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Visits by Status">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" fill="hsl(174, 62%, 38%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <Empty />}
              </ChartCard>

              <ChartCard title="Visits by Priority">
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty />}
              </ChartCard>
            </div>

            <ChartCard title="Top 10 Complaints">
              {topComplaints.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topComplaints} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(210, 80%, 55%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Patients by Faculty">
                {facultyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={facultyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {facultyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty />}
              </ChartCard>

              <ChartCard title="Patients by Gender">
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} label={({ name, value }) => `${name}: ${value}`}>
                        {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty />}
              </ChartCard>
            </div>

            <ChartCard title="Visits per Faculty">
              {facultyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={facultyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(152, 60%, 42%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <ChartCard title="Monthly Visits & Referrals">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="visits" stroke="hsl(174, 62%, 38%)" fill="hsl(174, 62%, 38%)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="referrals" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>

            <ChartCard title="Daily Visits (Last 30 Days)">
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="visits" stroke="hsl(210, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <ChartCard title="Low Stock Alerts">
              {inventoryAlerts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Medication</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Current Stock</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reorder Level</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Unit</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expiry</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryAlerts.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4">{item.quantity}</td>
                          <td className="py-3 px-4">{item.reorder}</td>
                          <td className="py-3 px-4 text-muted-foreground">{item.unit}</td>
                          <td className="py-3 px-4 text-muted-foreground">{item.expiry ? format(new Date(item.expiry), 'dd MMM yyyy') : '—'}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={item.quantity === 0 ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-warning/10 text-warning border-warning/30'}>
                              {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>All medications are well stocked!</p>
                </div>
              )}
            </ChartCard>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-serif text-lg font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-muted-foreground text-center py-12">No data available for this period</p>;
}
