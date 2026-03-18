import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Clock, Stethoscope, CheckCircle, AlertTriangle } from 'lucide-react';

export default function PatientQueue() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    const { data } = await supabase.from('visits')
      .select('*')
      .in('status', ['waiting', 'in_consultation'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });
    const fetchedVisits = data || [];
    // Load patient profiles
    if (data && data.length > 0) {
      const ids = [...new Set(data.map(v => v.patient_id))];
      const [profsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', ids),
        supabase.from('user_roles').select('*').in('user_id', ids)
      ]);
      const rolesMap: Record<string, string> = {};
      rolesRes.data?.forEach(r => { rolesMap[r.user_id] = r.role; });

      const map: Record<string, any> = {};
      profsRes.data?.forEach(p => { 
        map[p.user_id] = { ...p, app_role: rolesMap[p.user_id] || 'student' }; 
      });
      setProfiles(map);
      
      const studentVisits = fetchedVisits.filter(v => (rolesMap[v.patient_id] || 'student') === 'student');
      setVisits(studentVisits);
    } else {
      setVisits([]);
    }
  }

  async function updateStatus(visitId: string, status: string) {
    const update: any = { status };
    if (status === 'in_consultation') update.staff_id = user?.id;
    if (status === 'completed') update.check_out_time = new Date().toISOString();
    
    const { error } = await supabase.from('visits').update(update).eq('id', visitId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status updated to ${status.replace('_', ' ')}`);
    loadQueue();
  }

  const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
  const sorted = [...visits].sort((a, b) => {
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    return pa - pb;
  });

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="font-serif text-3xl font-bold mb-2">Patient Queue</h1>
        <p className="text-muted-foreground mb-8">{sorted.length} patient(s) in queue</p>

        {sorted.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <p className="text-muted-foreground">No patients waiting. All clear!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((visit, i) => {
              const profile = profiles[visit.patient_id];
              const isEmergency = visit.priority === 'emergency';
              return (
                <div key={visit.id} className={`bg-card rounded-xl border p-6 transition-shadow hover:shadow-md ${isEmergency ? 'border-destructive/50 animate-pulse-soft' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isEmergency ? 'bg-destructive text-destructive-foreground' : 'bg-primary/10 text-primary'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground flex items-center flex-wrap gap-2">
                          <span>{profile?.full_name || 'Unknown Patient'}</span>
                          {profile?.app_role === 'staff' && <Badge variant="secondary" className="text-[10px] py-0 h-4">Staff</Badge>}
                          {profile?.app_role === 'admin' && <Badge variant="destructive" className="text-[10px] py-0 h-4">Admin</Badge>}
                          {profile?.student_id && profile?.app_role === 'student' && <span className="text-muted-foreground font-normal ml-1">({profile.student_id})</span>}
                        </p>
                        <p className="text-sm text-foreground mt-1">{visit.chief_complaint}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(visit.check_in_time), 'HH:mm')}</span>
                          <span>{visit.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={
                        visit.priority === 'emergency' ? 'priority-emergency' :
                        visit.priority === 'high' ? 'priority-high' :
                        'priority-normal'
                      }>{visit.priority}</Badge>
                      <div className="flex gap-2">
                        {visit.status === 'waiting' && (
                          <Button size="sm" onClick={() => updateStatus(visit.id, 'in_consultation')}>
                            <Stethoscope className="w-4 h-4 mr-1" /> Start Consultation
                          </Button>
                        )}
                        {visit.status === 'in_consultation' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(visit.id, 'completed')}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
