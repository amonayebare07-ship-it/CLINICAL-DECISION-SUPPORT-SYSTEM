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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Loader2, ArrowRightLeft, Pill, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CDSSPanel from '@/components/cdss/CDSSPanel';
import AllergyManager from '@/components/cdss/AllergyManager';

interface DispenseEntry {
  medication_id: string;
  name: string;
  quantity: number;
  available: number;
}

export default function Consultations() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ symptoms: '', diagnosis: '', treatment: '', prescription: '', notes: '', follow_up_date: '', is_referred: false, referral_hospital: '', referral_reason: '', referral_notes: '' });

  // Medication dispensing state
  const [inventory, setInventory] = useState<any[]>([]);
  const [dispensed, setDispensed] = useState<DispenseEntry[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [dispenseQty, setDispenseQty] = useState('1');

  // CDSS state
  const [patientAllergies, setPatientAllergies] = useState<string[]>([]);
  const [patientConditions, setPatientConditions] = useState<string[]>([]);
  const [pastRecords, setPastRecords] = useState<any[]>([]);

  useEffect(() => { loadVisits(); loadInventory(); }, []);

  async function loadVisits() {
    const { data } = await supabase.from('visits').select('*').eq('status', 'in_consultation').order('created_at', { ascending: true });
    setVisits(data || []);
    if (data && data.length > 0) {
      const ids = [...new Set(data.map(v => v.patient_id))];
      const { data: profs } = await supabase.from('profiles').select('*').in('user_id', ids);
      const map: Record<string, any> = {};
      profs?.forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
  }

  async function loadInventory() {
    const { data } = await supabase.from('medication_inventory').select('*').order('name');
    setInventory(data || []);
  }

  async function loadPatientCDSSData(patientId: string) {
    const [allergiesRes, conditionsRes, recordsRes] = await Promise.all([
      supabase.from('patient_allergies' as any).select('*').eq('patient_id', patientId),
      supabase.from('patient_conditions' as any).select('*').eq('patient_id', patientId).eq('status', 'active'),
      supabase.from('medical_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(5),
    ]);
    setPatientAllergies(((allergiesRes.data as any[]) || []).map((a: any) => `${a.name} (${a.allergy_type}, ${a.severity})`));
    setPatientConditions(((conditionsRes.data as any[]) || []).map((c: any) => c.condition_name));
    setPastRecords(recordsRes.data || []);
  }

  function addDispenseEntry() {
    if (!selectedMedId) return;
    const med = inventory.find(m => m.id === selectedMedId);
    if (!med) return;
    const qty = parseInt(dispenseQty) || 0;
    if (qty <= 0) { toast.error('Enter a valid quantity'); return; }
    const alreadyAdded = dispensed.filter(d => d.medication_id === med.id).reduce((s, d) => s + d.quantity, 0);
    if (qty + alreadyAdded > med.quantity) {
      toast.error(`Only ${med.quantity - alreadyAdded} ${med.unit} of ${med.name} available`);
      return;
    }
    setDispensed(prev => [...prev, { medication_id: med.id, name: `${med.name} (${med.unit})`, quantity: qty, available: med.quantity - alreadyAdded - qty }]);
    setSelectedMedId('');
    setDispenseQty('1');
  }

  function removeDispenseEntry(index: number) {
    setDispensed(prev => prev.filter((_, i) => i !== index));
  }

  async function saveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisit || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_records').insert({
        visit_id: selectedVisit.id,
        patient_id: selectedVisit.patient_id,
        staff_id: user.id,
        ...form,
        follow_up_date: form.follow_up_date || null,
      });
      if (error) throw error;

      for (const entry of dispensed) {
        const { error: dErr } = await supabase.from('dispensed_medications' as any).insert({
          visit_id: selectedVisit.id,
          medication_id: entry.medication_id,
          patient_id: selectedVisit.patient_id,
          staff_id: user.id,
          quantity_dispensed: entry.quantity,
        });
        if (dErr) throw dErr;
        const med = inventory.find(m => m.id === entry.medication_id);
        if (med) {
          const newQty = Math.max(0, med.quantity - entry.quantity);
          const { error: uErr } = await supabase.from('medication_inventory').update({ quantity: newQty }).eq('id', entry.medication_id);
          if (uErr) throw uErr;
        }
      }

      const newStatus = form.is_referred ? 'referred' : 'completed';
      await supabase.from('visits').update({ status: newStatus, check_out_time: new Date().toISOString() }).eq('id', selectedVisit.id);

      if (dispensed.length > 0) {
        toast.success(`Record saved. ${dispensed.length} medication(s) dispensed and stock updated.`);
      } else {
        toast.success(form.is_referred ? 'Patient referred and record saved.' : 'Medical record saved and visit completed.');
      }

      setOpen(false);
      setForm({ symptoms: '', diagnosis: '', treatment: '', prescription: '', notes: '', follow_up_date: '', is_referred: false, referral_hospital: '', referral_reason: '', referral_notes: '' });
      setDispensed([]);
      loadVisits();
      loadInventory();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const medicalHistorySummary = pastRecords.map(r => `${r.diagnosis || 'No diagnosis'} (${r.treatment || 'No treatment'})`).join('; ');

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="font-serif text-3xl font-bold mb-2">Active Consultations</h1>
        <p className="text-muted-foreground mb-8">Record diagnoses and prescriptions for patients currently in consultation</p>

        {visits.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No active consultations. Start one from the Patient Queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visits.map(visit => {
              const profile = profiles[visit.patient_id];
              return (
                <Card key={visit.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{profile?.full_name || 'Unknown'}</CardTitle>
                      <Badge variant="outline" className="bg-info/10 text-info border-info/30">In Consultation</Badge>
                    </div>
                    {profile?.student_id && <p className="text-sm text-muted-foreground">{profile.student_id}</p>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2"><strong>Complaint:</strong> {visit.chief_complaint}</p>
                    <p className="text-xs text-muted-foreground mb-4">Checked in at {format(new Date(visit.check_in_time), 'HH:mm')}</p>
                    <Dialog open={open && selectedVisit?.id === visit.id} onOpenChange={(o) => {
                      setOpen(o);
                      if (o) {
                        setSelectedVisit(visit);
                        setDispensed([]);
                        loadPatientCDSSData(visit.patient_id);
                        // Pre-fill symptoms from complaint
                        setForm(prev => ({ ...prev, symptoms: visit.chief_complaint }));
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full" onClick={() => setSelectedVisit(visit)}>
                          <Plus className="w-4 h-4 mr-2" /> Record Consultation
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Medical Record — {profile?.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-4 overflow-hidden flex-1">
                          {/* Left: Form */}
                          <form onSubmit={saveRecord} className="space-y-4 overflow-y-auto flex-1 pr-2 min-w-0">
                            {/* Allergies & Conditions inline */}
                            <AllergyManager patientId={visit.patient_id} />

                            <div className="space-y-2">
                              <Label>Symptoms</Label>
                              <Textarea value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} placeholder="Observed symptoms" />
                            </div>
                            <div className="space-y-2">
                              <Label>Diagnosis</Label>
                              <Input value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder="Diagnosis" />
                            </div>
                            <div className="space-y-2">
                              <Label>Treatment</Label>
                              <Textarea value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} placeholder="Treatment administered" />
                            </div>
                            <div className="space-y-2">
                              <Label>Prescription</Label>
                              <Textarea value={form.prescription} onChange={e => setForm({...form, prescription: e.target.value})} placeholder="Prescribed medication" />
                            </div>

                            {/* Medication Dispensing Section */}
                            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                              <div className="flex items-center gap-2 mb-1">
                                <Pill className="w-4 h-4 text-primary" />
                                <Label className="text-base font-semibold">Dispense Medications</Label>
                              </div>
                              <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Medication</Label>
                                  <Select value={selectedMedId} onValueChange={setSelectedMedId}>
                                    <SelectTrigger><SelectValue placeholder="Select medication" /></SelectTrigger>
                                    <SelectContent>
                                      {inventory.filter(m => m.quantity > 0).map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {m.name} — {m.quantity} {m.unit} available
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-20 space-y-1">
                                  <Label className="text-xs">Qty</Label>
                                  <Input type="number" min="1" value={dispenseQty} onChange={e => setDispenseQty(e.target.value)} />
                                </div>
                                <Button type="button" size="sm" variant="secondary" onClick={addDispenseEntry}>Add</Button>
                              </div>
                              {dispensed.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  {dispensed.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between bg-background rounded-md px-3 py-2 text-sm border border-border">
                                      <span>{d.name} × <strong>{d.quantity}</strong></span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">Balance: {d.available}</span>
                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeDispenseEntry(i)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Follow-up Date</Label>
                              <Input type="date" value={form.follow_up_date} onChange={e => setForm({...form, follow_up_date: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>Additional Notes</Label>
                              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes" />
                            </div>

                            {/* Referral Section */}
                            <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                                  <Label className="text-base font-semibold">Refer Patient</Label>
                                </div>
                                <Switch checked={form.is_referred} onCheckedChange={v => setForm({...form, is_referred: v})} />
                              </div>
                              {form.is_referred && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Referral Hospital / Facility</Label>
                                    <Input value={form.referral_hospital} onChange={e => setForm({...form, referral_hospital: e.target.value})} placeholder="e.g. Mulago National Referral Hospital" required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Reason for Referral</Label>
                                    <Textarea value={form.referral_reason} onChange={e => setForm({...form, referral_reason: e.target.value})} placeholder="Why is the patient being referred?" required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Referral Notes (visible to student)</Label>
                                    <Textarea value={form.referral_notes} onChange={e => setForm({...form, referral_notes: e.target.value})} placeholder="Additional referral details" />
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex gap-3 sticky bottom-0 bg-background pt-2 pb-1">
                              <Button type="button" variant="outline" className="flex-1" disabled={loading} onClick={() => toast.success('Draft saved locally.')}>
                                Save Draft
                              </Button>
                              <Button type="submit" className="flex-1" disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save & Complete
                              </Button>
                            </div>
                          </form>

                          {/* Right: CDSS Panel */}
                          <div className="w-80 overflow-y-auto shrink-0 hidden lg:block">
                            <CDSSPanel
                              symptoms={form.symptoms}
                              diagnosis={form.diagnosis}
                              prescription={form.prescription}
                              patientId={visit.patient_id}
                              allergies={patientAllergies}
                              conditions={patientConditions}
                              currentMedications={dispensed.map(d => d.name)}
                              medicalHistory={medicalHistorySummary}
                              onSuggestDiagnosis={(d) => setForm(prev => ({ ...prev, diagnosis: d }))}
                              onSuggestTreatment={(t) => setForm(prev => ({ ...prev, treatment: prev.treatment ? `${prev.treatment}\n${t}` : t }))}
                              onSuggestPrescription={(p) => setForm(prev => ({ ...prev, prescription: prev.prescription ? `${prev.prescription}\n${p}` : p }))}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
