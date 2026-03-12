import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar, Clock, CheckCircle, Wifi, Users, Stethoscope,
  ClipboardList, TrendingUp, TrendingDown, MoreHorizontal, ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function Dashboard() {
  const { role, user, profile } = useAuth();
  const [stats, setStats] = useState({ visits: 0, consultations: 0, completed: 0, totalPatients: 0, appointments: 0 });
  const [weekChange, setWeekChange] = useState({ visits: 0, consultations: 0, completed: 0, totalPatients: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [onlineStudents, setOnlineStudents] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('year');

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, role]);

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = subDays(new Date(), 7).toISOString();
    const twoWeeksAgo = subDays(new Date(), 14).toISOString();

    if (role === 'student') {
      const [visitsRes, apptRes] = await Promise.all([
        supabase.from('visits').select('*').eq('patient_id', user!.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select('*').eq('patient_id', user!.id).eq('status', 'scheduled'),
      ]);
      setRecentVisits(visitsRes.data || []);
      setStats({
        visits: visitsRes.data?.length || 0,
        consultations: 0,
        completed: visitsRes.data?.filter(v => v.status === 'completed').length || 0,
        totalPatients: 0,
        appointments: apptRes.data?.length || 0,
      });
    } else {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const startDate = startOfMonth(subMonths(new Date(), 11)).toISOString();

      const [
        allVisitsRes, thisWeekVisits, lastWeekVisits,
        consultationsThisWeek, consultationsLastWeek,
        completedThisWeek, completedLastWeek,
        profilesRes, onlineRes, apptsRes
      ] = await Promise.all([
        supabase.from('visits').select('*').gte('created_at', startDate),
        supabase.from('visits').select('*', { count: 'exact', head: true }).gte('created_at', lastWeek),
        supabase.from('visits').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', lastWeek),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'in_consultation').gte('created_at', lastWeek),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'in_consultation').gte('created_at', twoWeeksAgo).lt('created_at', lastWeek),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', lastWeek),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', twoWeeksAgo).lt('created_at', lastWeek),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*').gte('last_seen', fiveMinAgo),
        supabase.from('appointments').select('*, profiles(full_name)').eq('status', 'scheduled').gte('appointment_date', today).order('appointment_date', { ascending: true }).limit(5),
      ]);

      const thisW = thisWeekVisits.count || 0;
      const lastW = lastWeekVisits.count || 0;
      const consThisW = consultationsThisWeek.count || 0;
      const consLastW = consultationsLastWeek.count || 0;
      const compThisW = completedThisWeek.count || 0;
      const compLastW = completedLastWeek.count || 0;
      const totalP = profilesRes.count || 0;

      const calcChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      setStats({
        visits: thisW,
        consultations: consThisW,
        completed: compThisW,
        totalPatients: totalP,
        appointments: apptsRes.data?.length || 0,
      });

      setWeekChange({
        visits: calcChange(thisW, lastW),
        consultations: calcChange(consThisW, consLastW),
        completed: calcChange(compThisW, compLastW),
        totalPatients: 0,
      });

      setOnlineStudents(onlineRes.data || []);
      setUpcomingAppointments(apptsRes.data || []);

      // Monthly chart data
      const visits = allVisitsRes.data || [];
      const monthRange = eachMonthOfInterval({ start: new Date(startDate), end: new Date() });
      setMonthlyData(monthRange.map(m => {
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const totalV = visits.filter(v => { const d = parseISO(v.created_at); return d >= mStart && d <= mEnd; }).length;
        const completed = visits.filter(v => { const d = parseISO(v.created_at); return d >= mStart && d <= mEnd && v.status === 'completed'; }).length;
        return { month: format(m, 'MMM').toUpperCase(), total: totalV, completed };
      }));

      // Recent visits
      const recentRes = await supabase.from('visits').select('*').order('created_at', { ascending: false }).limit(5);
      setRecentVisits(recentRes.data || []);
    }
  }

  const ChangeIndicator = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
      {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value >= 0 ? '+' : ''}{value}%
      <span className="text-muted-foreground font-normal">from last week</span>
    </span>
  );

  const priorityBadge = (p: string) => {
    const cls = p === 'emergency' ? 'priority-emergency' : p === 'high' ? 'priority-high' : p === 'normal' ? 'priority-normal' : 'priority-low';
    return <Badge variant="outline" className={cls}>{p}</Badge>;
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      waiting: 'bg-warning/10 text-warning border-warning/30',
      in_consultation: 'bg-info/10 text-info border-info/30',
      completed: 'bg-success/10 text-success border-success/30',
      referred: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return <Badge variant="outline" className={colors[s] || ''}>{s.replace('_', ' ')}</Badge>;
  };

  // Student dashboard (simple)
  if (role === 'student') {
    return (
      <DashboardLayout>
        <div className="animate-fade-in">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">My Health Dashboard</h1>
          <p className="text-muted-foreground mb-8">Track your health visits and appointments</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <StatBox icon={ClipboardList} label="Total Visits" value={stats.visits} color="primary" />
            <StatBox icon={CheckCircle} label="Completed" value={stats.completed} color="success" />
            <StatBox icon={Calendar} label="Appointments" value={stats.appointments} color="accent" />
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-serif text-xl font-bold mb-4">Recent Visits</h2>
            {recentVisits.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No visits recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Complaint</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody>{recentVisits.map(visit => (
                    <tr key={visit.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">{format(new Date(visit.created_at), 'MMM dd, yyyy')}</td>
                      <td className="py-3 px-4 max-w-[200px] truncate">{visit.chief_complaint}</td>
                      <td className="py-3 px-4">{priorityBadge(visit.priority || 'normal')}</td>
                      <td className="py-3 px-4">{statusBadge(visit.status)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Staff / Admin dashboard (like reference image)
  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              Welcome back, {profile?.full_name?.split(' ')[0] || user?.email || 'User'} 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              Ready for another great day? Here's your clinical overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, dd MMMM')}</span>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashStatCard
            icon={Calendar}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label="Appointments"
            value={stats.visits}
            change={weekChange.visits}
            active
          />
          <DashStatCard
            icon={Stethoscope}
            iconBg="bg-info/10"
            iconColor="text-info"
            label="Consultations"
            value={stats.consultations}
            change={weekChange.consultations}
          />
          <DashStatCard
            icon={CheckCircle}
            iconBg="bg-success/10"
            iconColor="text-success"
            label="Completed"
            value={stats.completed}
            change={weekChange.completed}
          />
          <DashStatCard
            icon={Users}
            iconBg="bg-accent/10"
            iconColor="text-accent"
            label="Total Patients"
            value={stats.totalPatients}
            change={weekChange.totalPatients}
          />
        </div>

        {/* Main Content Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Statistics Chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold">Patient Statistics</h2>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {(['week', 'month', 'year'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                      chartPeriod === p ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p === 'year' ? `Year-${new Date().getFullYear()}` : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(174, 62%, 38%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(174, 62%, 38%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 20%, 90%)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(210, 10%, 50%)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(210, 10%, 50%)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(200, 20%, 90%)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total patients"
                    stroke="hsl(174, 62%, 38%)"
                    strokeWidth={2.5}
                    fill="url(#gradTotal)"
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(0, 0%, 100%)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="hsl(152, 60%, 42%)"
                    strokeWidth={2}
                    fill="url(#gradCompleted)"
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </div>

          {/* Right Column: Upcoming Appointments */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold">Today {format(new Date(), 'dd MMM yyyy')}</h2>
            </div>

            {/* Mini calendar week strip */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {Array.from({ length: 7 }, (_, i) => {
                const d = subDays(new Date(), 3 - i);
                const isToday = i === 3;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium min-w-[40px] ${
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{format(d, 'EEE')}</span>
                    <span className="text-base font-bold mt-0.5">{format(d, 'd')}</span>
                  </div>
                );
              })}
            </div>

            {/* Appointment list */}
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No upcoming appointments</p>
              ) : (
                upcomingAppointments.map(appt => (
                  <div key={appt.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="w-1 h-full min-h-[40px] rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{appt.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.appointment_date), 'hh:mm a')}
                      </p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Online Students */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                <Wifi className="w-4 h-4 text-primary" />
                Online Now
              </h2>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {onlineStudents.length}
              </Badge>
            </div>
            {onlineStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">No students online</p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {onlineStudents.slice(0, 8).map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {s.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.faculty || 'Student'}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {s.last_seen ? format(new Date(s.last_seen), 'HH:mm') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Visits / Reports */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold">Recent Visits</h2>
              <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {recentVisits.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No visits recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentVisits.map(visit => (
                  <div key={visit.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{visit.chief_complaint}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(visit.created_at), 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(visit.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DashStatCard({ icon: Icon, iconBg, iconColor, label, value, change, active }: {
  icon: any; iconBg: string; iconColor: string; label: string; value: number; change: number; active?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${
      active ? 'bg-primary text-primary-foreground border-primary shadow-lg' : 'bg-card border-border'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          active ? 'bg-primary-foreground/20' : iconBg
        }`}>
          <Icon className={`w-5 h-5 ${active ? 'text-primary-foreground' : iconColor}`} />
        </div>
        <span className={`text-sm font-medium ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      <p className={`text-3xl font-bold ${active ? '' : 'text-foreground'}`}>
        {value.toLocaleString()}
      </p>
      <div className="mt-1">
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
          active
            ? 'text-primary-foreground/70'
            : change >= 0 ? 'text-success' : 'text-destructive'
        }`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% from last week
        </span>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const bgMap: Record<string, string> = {
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/5 border-success/20',
    accent: 'bg-accent/5 border-accent/20',
  };
  const iconMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    accent: 'bg-accent/10 text-accent',
  };
  return (
    <div className={`rounded-xl border p-6 ${bgMap[color] || ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconMap[color] || ''}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
