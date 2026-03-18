import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Calendar, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function Appointments() {
  const { user, role } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ appointment_date: '', reason: '', notes: '' });
  const [endAction, setEndAction] = useState<{ id: string; action: 'completed' | 'cancelled' } | null>(null);

  useEffect(() => { if (user) loadAppointments(); }, [user]);

  async function loadAppointments() {
    let q = supabase.from('appointments').select('*').order('appointment_date', { ascending: true });
    if (role === 'student') q = q.eq('patient_id', user!.id);
    const { data } = await q;
    const fetchedAppointments = data || [];

    // Load patient profiles for staff/admin
    if (role !== 'student' && data && data.length > 0) {
      const ids = [...new Set(data.map(a => a.patient_id))];
      const [profsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', ids),
        supabase.from('user_roles').select('*').in('user_id', ids)
      ]);
      const rolesMap: Record<string, string> = {};
      rolesRes.data?.forEach(r => { rolesMap[r.user_id] = r.role; });

      const map: Record<string, any> = {};
      profsRes.data?.forEach(p => { map[p.user_id] = p; });
      setProfiles(map);

      const studentAppointments = fetchedAppointments.filter(a => (rolesMap[a.patient_id] || 'student') === 'student');
      setAppointments(studentAppointments);
    } else {
      setAppointments(fetchedAppointments);
    }
  }

  async function createAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        appointment_date: form.appointment_date,
        reason: form.reason,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success('Appointment booked successfully!');
      setOpen(false);
      setForm({ appointment_date: '', reason: '', notes: '' });
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function endAppointment() {
    if (!endAction) return;
    try {
      const { error } = await supabase.from('appointments').update({ status: endAction.action }).eq('id', endAction.id);
      if (error) throw error;
      toast.success(`Appointment ${endAction.action}`);
      setEndAction(null);
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const statusColor: Record<string, string> = {
    scheduled: 'bg-info/10 text-info border-info/30',
    completed: 'bg-success/10 text-success border-success/30',
    cancelled: 'bg-muted text-muted-foreground border-border',
    no_show: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2">Appointments</h1>
            <p className="text-muted-foreground">Manage your scheduled appointments</p>
          </div>
          {role === 'student' && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Book Appointment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Book an Appointment</DialogTitle></DialogHeader>
                <form onSubmit={createAppointment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input type="datetime-local" value={form.appointment_date} onChange={e => setForm({...form, appointment_date: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required placeholder="Reason for visit" maxLength={500} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes" maxLength={500} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Book Appointment
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No appointments scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map(appt => {
              const patient = profiles[appt.patient_id];
              return (
                <div key={appt.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      {role !== 'student' && patient && (
                        <p className="text-xs text-muted-foreground mb-1 font-medium">{patient.full_name} {patient.student_id ? `(${patient.student_id})` : ''}</p>
                      )}
                      <p className="font-medium">{appt.reason}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(appt.appointment_date), 'EEEE, MMMM dd yyyy • HH:mm')}
                      </p>
                      {appt.notes && <p className="text-sm mt-2 text-muted-foreground">{appt.notes}</p>}
                    </div>
                    <Badge variant="outline" className={statusColor[appt.status] || ''}>{appt.status.replace('_', ' ')}</Badge>
                  </div>
                  {(role === 'staff' || role === 'admin') && appt.status === 'scheduled' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => setEndAction({ id: appt.id, action: 'completed' })}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Complete
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setEndAction({ id: appt.id, action: 'cancelled' })}>
                        <XCircle className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!endAction} onOpenChange={(o) => { if (!o) setEndAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{endAction?.action === 'completed' ? 'Complete' : 'Cancel'} Appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark this appointment as {endAction?.action}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction onClick={endAppointment}>
                {endAction?.action === 'completed' ? 'Complete' : 'Cancel'} Appointment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
