import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Loader2, Search, FlaskConical, User } from 'lucide-react';

const TEST_CATEGORIES = ['general', 'hematology', 'biochemistry', 'urinalysis', 'microbiology', 'serology'];
const RESULT_STATUSES = ['normal', 'abnormal', 'critical'];

export default function LabResults() {
  const { user, role } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    visit_id: '', test_name: '', test_category: 'general', result: '',
    reference_range: '', unit: '', status: 'normal', notes: '',
  });

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    if (role === 'student') {
      // Students see own results
      const { data } = await supabase.from('lab_results' as any).select('*').eq('patient_id', user!.id).order('created_at', { ascending: false });
      setResults((data as any[]) || []);
    } else {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      setPatients(data || []);
    }
  }

  async function selectPatient(patient: any) {
    setSelectedPatient(patient);
    const [resultsRes, visitsRes] = await Promise.all([
      supabase.from('lab_results' as any).select('*').eq('patient_id', patient.user_id).order('created_at', { ascending: false }),
      supabase.from('visits').select('*').eq('patient_id', patient.user_id).order('created_at', { ascending: false }).limit(10),
    ]);
    setResults((resultsRes.data as any[]) || []);
    setVisits(visitsRes.data || []);
  }

  async function saveResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !user || !form.visit_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('lab_results' as any).insert({
        visit_id: form.visit_id,
        patient_id: selectedPatient.user_id,
        staff_id: user.id,
        test_name: form.test_name,
        test_category: form.test_category,
        result: form.result,
        reference_range: form.reference_range || null,
        unit: form.unit || null,
        status: form.status,
        notes: form.notes || null,
      });
      if (error) throw error;

      // Create notification for student
      await supabase.from('notifications' as any).insert({
        user_id: selectedPatient.user_id,
        title: 'Lab Result Available',
        message: `Your ${form.test_name} result is now available.`,
        type: form.status === 'critical' ? 'warning' : 'info',
        link: '/lab-results',
      });

      toast.success('Lab result saved');
      setOpen(false);
      setForm({ visit_id: '', test_name: '', test_category: 'general', result: '', reference_range: '', unit: '', status: 'normal', notes: '' });
      selectPatient(selectedPatient);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      normal: 'bg-success/10 text-success border-success/30',
      abnormal: 'bg-warning/10 text-warning border-warning/30',
      critical: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return <Badge variant="outline" className={colors[s] || ''}>{s}</Badge>;
  };

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  // Student view
  if (role === 'student') {
    return (
      <DashboardLayout>
        <div className="animate-fade-in">
          <h1 className="font-serif text-3xl font-bold mb-2">My Lab Results</h1>
          <p className="text-muted-foreground mb-8">View your laboratory test results</p>
          {results.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No lab results yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{r.test_name}</h3>
                      <div className="flex items-center gap-2">
                        {statusBadge(r.status)}
                        <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Category:</span> <span className="capitalize">{r.test_category}</span></div>
                      <div><span className="text-muted-foreground">Result:</span> <strong>{r.result}</strong> {r.unit}</div>
                      {r.reference_range && <div><span className="text-muted-foreground">Reference:</span> {r.reference_range}</div>}
                      {r.notes && <div><span className="text-muted-foreground">Notes:</span> {r.notes}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Staff view
  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="font-serif text-3xl font-bold mb-2">Laboratory Results</h1>
        <p className="text-muted-foreground mb-8">Record and manage patient lab test results</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filtered.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => selectPatient(patient)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedPatient?.id === patient.id ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:bg-muted/30'
                  }`}
                >
                  <p className="font-medium text-foreground">{patient.full_name || 'Unnamed'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {patient.student_id && <span>{patient.student_id}</span>}
                    {patient.gender && <span>• {patient.gender}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!selectedPatient ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a patient to view and record lab results.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-bold">{selectedPatient.full_name}'s Lab Results</h2>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="w-4 h-4 mr-2" /> Record Result</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Record Lab Result</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={saveResult} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Visit</Label>
                          <Select value={form.visit_id} onValueChange={v => setForm({ ...form, visit_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select visit" /></SelectTrigger>
                            <SelectContent>
                              {visits.map(v => (
                                <SelectItem key={v.id} value={v.id}>
                                  {format(new Date(v.created_at), 'MMM dd, yyyy')} — {v.chief_complaint}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Test Name</Label>
                            <Input value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} placeholder="e.g. Malaria RDT" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={form.test_category} onValueChange={v => setForm({ ...form, test_category: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TEST_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Result</Label>
                            <Input value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} placeholder="e.g. Positive" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. mg/dL" />
                          </div>
                          <div className="space-y-2">
                            <Label>Reference Range</Label>
                            <Input value={form.reference_range} onChange={e => setForm({ ...form, reference_range: e.target.value })} placeholder="e.g. 70-100" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RESULT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading || !form.visit_id}>
                          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Result
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {results.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-xl border border-border">
                    <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No lab results recorded for this patient.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((r: any) => (
                      <Card key={r.id} className="border-border/50">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4 text-primary" />
                              <h3 className="font-semibold">{r.test_name}</h3>
                              <Badge variant="outline" className="capitalize">{r.test_category}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {statusBadge(r.status)}
                              <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
                            <div><span className="text-muted-foreground">Result:</span> <strong>{r.result}</strong> {r.unit && <span className="text-muted-foreground">{r.unit}</span>}</div>
                            {r.reference_range && <div><span className="text-muted-foreground">Reference:</span> {r.reference_range}</div>}
                            {r.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {r.notes}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
