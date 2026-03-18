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
import { Plus, Loader2, ArrowRightLeft, Pill, Trash2, FileText, Brain } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CDSSPanel from '@/components/cdss/CDSSPanel';
import AllergyManager from '@/components/cdss/AllergyManager';

interface DispenseEntry {
  medication_id: string;
  name: string;
  quantity: number;
  available: number;
}

export default function Consultations() {
  const { user: authUser } = useAuth();

  const [visits, setVisits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    symptoms: '', diagnosis: '', treatment: '', prescription: '', 
    notes: '', follow_up_date: '', is_referred: false, 
    referral_hospital: '', referral_reason: '', referral_notes: '' 
  });

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
    
    // Also add to the prescription text area automatically
    const newPrescriptionEntry = `${med.name} — ${qty} ${med.unit}`;
    setForm(prev => ({
      ...prev,
      prescription: prev.prescription 
        ? `${prev.prescription.trim()}\n${newPrescriptionEntry}`
        : newPrescriptionEntry
    }));

    setSelectedMedId('');
    setDispenseQty('1');
  }

  function attemptAutoDispense(medName: string, quantity: number = 10) {
    if (!medName) return;
    const lowerInput = medName.toLowerCase();
    const match = inventory.find(m => {
      const lowerMed = m.name.toLowerCase();
      return lowerInput.includes(lowerMed) || lowerMed.includes(lowerInput.split(' ')[0]);
    });
    if (match && match.quantity > 0) {
      const alreadyDispensed = dispensed.some(d => d.medication_id === match.id);
      if (!alreadyDispensed) {
        setDispensed(prev => [...prev, { 
          medication_id: match.id, 
          name: `${match.name} (${match.unit})`, 
          quantity: Math.min(quantity, match.quantity), 
          available: Math.max(0, match.quantity - quantity) 
        }]);
        toast.info(`Auto-tracked ${match.name} in inventory.`);
      }
    }
  }

  function removeDispenseEntry(index: number) {
    setDispensed(prev => prev.filter((_, i) => i !== index));
  }

  async function saveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisit || !authUser) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_records').insert({
        visit_id: selectedVisit.id,
        patient_id: selectedVisit.patient_id,
        staff_id: authUser.id,
        ...form,
        follow_up_date: form.follow_up_date || null,
      });
      if (error) throw error;

      for (const entry of dispensed) {
        const { error: dErr } = await supabase.from('dispensed_medications' as any).insert({
          visit_id: selectedVisit.id,
          medication_id: entry.medication_id,
          patient_id: selectedVisit.patient_id,
          staff_id: authUser.id,
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

      await supabase.from('notifications').insert({
        user_id: selectedVisit.patient_id,
        title: 'Consultation Completed',
        message: `Your visit for "${selectedVisit.chief_complaint}" has been completed.`,
        type: 'info',
        link: '/my-visits'
      });

      toast.success('Medical record saved successfully!');
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

  async function seedInventory() {
    setLoading(true);
    try {
      const medications = [
        { name: 'Paracetamol 500mg', description: 'Analgesic and antipyretic for pain and fever.', quantity: 1000, unit: 'tablets', reorder_level: 200 },
        { name: 'Ibuprofen 400mg', description: 'Non-steroidal anti-inflammatory drug (NSAID).', quantity: 500, unit: 'tablets', reorder_level: 100 },
        { name: 'Amoxicillin 500mg', description: 'Broad-spectrum penicillin antibiotic.', quantity: 500, unit: 'capsules', reorder_level: 100 },
        { name: 'Ciprofloxacin 500mg', description: 'Fluoroquinolone antibiotic for UTIs and GI infections.', quantity: 300, unit: 'tablets', reorder_level: 50 },
        { name: 'Artemether/Lumefantrine (Coartem)', description: 'First-line ACT for uncomplicated malaria.', quantity: 150, unit: 'packs', reorder_level: 30 },
      ];
      const { error } = await supabase.from('medication_inventory').upsert(medications, { onConflict: 'name' });
      if (error) throw error;
      toast.success('Inventory seeded successfully!');
      loadInventory();
    } catch (err: any) {
      toast.error(`Seeding failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }


  const medicalHistorySummary = pastRecords.map(r => `${r.diagnosis || 'No diagnosis'} (${r.treatment || 'No treatment'})`).join('; ');

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2">Active Consultations</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Record diagnoses and prescriptions for patients currently in consultation</p>
          </div>
          {inventory.length === 0 && (
            <Button onClick={seedInventory} disabled={loading} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Seed Inventory
            </Button>
          )}
        </div>

        {visits.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
            <p className="text-muted-foreground">No active consultations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {visits.map(visit => {
              const profile = profiles[visit.patient_id];
              return (
                <Card key={visit.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg truncate">{profile?.full_name || 'Unknown User'}</CardTitle>
                      <Badge variant="outline" className="bg-info/10 text-info border-info/30 shrink-0">In Consultation</Badge>
                    </div>
                    {profile?.student_id && <p className="text-xs text-muted-foreground mt-1">{profile.student_id}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Chief Complaint</p>
                      <p className="line-clamp-2">{visit.chief_complaint}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Started {format(new Date(visit.check_in_time), 'HH:mm')}</span>
                    </div>

                    <Dialog open={open && selectedVisit?.id === visit.id} onOpenChange={(o) => {
                      setOpen(o);
                      if (o) {
                        setSelectedVisit(visit);
                        setDispensed([]);
                        loadPatientCDSSData(visit.patient_id);
                        setForm(prev => ({ ...prev, symptoms: visit.chief_complaint }));
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full shadow-sm" onClick={() => setSelectedVisit(visit)}>
                          <Plus className="w-4 h-4 mr-2" /> Record Consultation
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl w-[98vw] sm:w-[95vw] lg:w-[90vw] max-h-[96vh] flex flex-col p-0 overflow-hidden rounded-xl">
                        <DialogHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b shrink-0">
                          <DialogTitle className="text-lg sm:text-xl truncate">Consultation — {profile?.full_name}</DialogTitle>
                        </DialogHeader>

                        {/* Mobile: Tabs | Desktop: Side-by-side */}
                        <div className="flex-1 overflow-hidden p-0 flex flex-col min-h-0">
                          <div className="lg:hidden flex-1 flex flex-col pt-2 min-h-0">
                            <Tabs defaultValue="record" className="flex-1 flex flex-col overflow-hidden min-h-0">
                              <TabsList className="grid w-full grid-cols-2 px-4 mb-2 bg-transparent shrink-0">
                                <TabsTrigger value="record" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center justify-center gap-2 py-2">
                                  <FileText className="w-4 h-4" /> Record
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center justify-center gap-2 py-2">
                                  <Brain className="w-4 h-4" /> AI Support
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="record" className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                                <form onSubmit={saveRecord} className="space-y-4">
                                  <ConsultationFormFields form={form} setForm={setForm} inventory={inventory} dispensed={dispensed} selectedMedId={selectedMedId} setSelectedMedId={setSelectedMedId} dispenseQty={dispenseQty} setDispenseQty={setDispenseQty} addDispenseEntry={addDispenseEntry} removeDispenseEntry={removeDispenseEntry} loading={loading} visitId={visit.patient_id} />
                                </form>
                              </TabsContent>
                              <TabsContent value="ai" className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
                                <CDSSPanelWrapper form={form} setForm={setForm} visit={visit} patientAllergies={patientAllergies} patientConditions={patientConditions} dispensed={dispensed} medicalHistorySummary={medicalHistorySummary} attemptAutoDispense={attemptAutoDispense} />
                              </TabsContent>
                            </Tabs>
                          </div>

                          <div className="hidden lg:flex flex-1 gap-0 overflow-hidden min-h-0">
                            {/* Left: Form */}
                            <form onSubmit={saveRecord} className="flex-1 overflow-y-auto px-8 py-6 space-y-6 border-r min-h-0">
                               <ConsultationFormFields form={form} setForm={setForm} inventory={inventory} dispensed={dispensed} selectedMedId={selectedMedId} setSelectedMedId={setSelectedMedId} dispenseQty={dispenseQty} setDispenseQty={setDispenseQty} addDispenseEntry={addDispenseEntry} removeDispenseEntry={removeDispenseEntry} loading={loading} visitId={visit.patient_id} />
                            </form>
                            {/* Right: AI Panel */}
                            <div className="w-80 overflow-y-auto shrink-0 bg-muted/10 px-6 py-6 scrollbar-hide min-h-0">
                              <CDSSPanelWrapper form={form} setForm={setForm} visit={visit} patientAllergies={patientAllergies} patientConditions={patientConditions} dispensed={dispensed} medicalHistorySummary={medicalHistorySummary} attemptAutoDispense={attemptAutoDispense} />
                            </div>
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

// Sub-components to keep Consultation code clean
function ConsultationFormFields({ form, setForm, inventory, dispensed, selectedMedId, setSelectedMedId, dispenseQty, setDispenseQty, addDispenseEntry, removeDispenseEntry, loading, visitId }: any) {
  return (
    <>
      <AllergyManager patientId={visitId} />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Symptoms</Label>
          <Textarea className="min-h-[100px] resize-none" value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} placeholder="Observed symptoms" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Diagnosis</Label>
          <Input value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder="Diagnosis" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Treatment</Label>
          <Textarea className="min-h-[80px] resize-none" value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} placeholder="Treatment administered" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Prescription</Label>
          <Textarea className="min-h-[80px] resize-none" value={form.prescription} onChange={e => setForm({...form, prescription: e.target.value})} placeholder="Prescribed medication" />
        </div>

        <div className="border border-border rounded-xl p-4 sm:p-5 bg-muted/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            <Label className="text-base font-bold">Dispense Medications</Label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Medication</Label>
              <Select value={selectedMedId} onValueChange={setSelectedMedId}>
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Select medication" /></SelectTrigger>
                <SelectContent>
                  {inventory.filter((m:any) => m.quantity > 0).map((m:any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-24 space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Qty</Label>
              <Input type="number" min="1" className="bg-background" value={dispenseQty} onChange={e => setDispenseQty(e.target.value)} />
            </div>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={addDispenseEntry}>Add</Button>
          </div>
          {dispensed.length > 0 && (
            <div className="pt-2 grid grid-cols-1 gap-2">
              {dispensed.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-card p-3 rounded-lg border shadow-sm text-sm transition-all animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span><strong>{d.name}</strong> × {d.quantity}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeDispenseEntry(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Follow-up Date</Label>
            <Input type="date" value={form.follow_up_date} onChange={e => setForm({...form, follow_up_date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Add to Additional Notes</Label>
            <Textarea className="min-h-[80px]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes to add..." />
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 sm:p-5 bg-muted/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <ArrowRightLeft className="w-4 h-4 text-primary" />
               <Label className="text-base font-bold">Refer Patient</Label>
             </div>
             <Switch checked={form.is_referred} onCheckedChange={v => setForm({...form, is_referred: v})} />
          </div>
          {form.is_referred && (
             <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
               <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase text-muted-foreground mr-1">Hospital / Facility</Label>
                 <Input className="bg-background" value={form.referral_hospital} onChange={e => setForm({...form, referral_hospital: e.target.value})} placeholder="e.g. Mulago Hospital" required />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase text-muted-foreground mr-1">Reason for Referral</Label>
                 <Textarea className="bg-background min-h-[80px]" value={form.referral_reason} onChange={e => setForm({...form, referral_reason: e.target.value})} placeholder="Why is the patient being referred?" required />
               </div>
             </div>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-6 pb-2 sticky bottom-0 bg-background/95 backdrop-blur-sm mt-4 border-t px-2 -mx-2">
        <Button type="button" variant="outline" className="flex-1 order-2 sm:order-1" disabled={loading}>Save Draft</Button>
        <Button type="submit" className="flex-1 order-1 sm:order-2 shadow-md" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Save & Complete Record
        </Button>
      </div>
    </>
  );
}

function CDSSPanelWrapper({ form, setForm, visit, patientAllergies, patientConditions, dispensed, medicalHistorySummary, attemptAutoDispense }: any) {
  return (
    <CDSSPanel
      symptoms={form.symptoms}
      diagnosis={form.diagnosis}
      prescription={form.prescription}
      patientId={visit.patient_id}
      allergies={patientAllergies}
      conditions={patientConditions}
      currentMedications={dispensed.map((d:any) => d.name)}
      medicalHistory={medicalHistorySummary}
      onSuggestDiagnosis={(d) => setForm((prev:any) => ({ ...prev, diagnosis: d }))}
      onSuggestTreatment={(t) => setForm((prev:any) => ({ ...prev, treatment: prev.treatment ? `${prev.treatment}\n${t}` : t }))}
      onSuggestPrescription={(p) => {
        setForm((prev:any) => ({ ...prev, prescription: prev.prescription ? `${prev.prescription}\n${p}` : p }));
        attemptAutoDispense(p);
      }}
      onAutoFill={(data) => {
        setForm((prev:any) => ({ 
          ...prev, 
          diagnosis: data.diagnosis || prev.diagnosis,
          treatment: data.treatment ? (prev.treatment ? `${prev.treatment.trim()}\n${data.treatment}` : data.treatment) : prev.treatment,
          prescription: data.prescription ? (prev.prescription ? `${prev.prescription.trim()}\n${data.prescription}` : data.prescription) : prev.prescription,
          follow_up_date: data.follow_up_date || prev.follow_up_date,
          notes: data.notes ? (prev.notes ? `${prev.notes.trim()}\n${data.notes}` : data.notes) : prev.notes,
        }));
        if (data.prescription) {
          data.prescription.split('\n').forEach((line:string) => attemptAutoDispense(line));
        }
      }}
      onUpdateSymptoms={(s) => setForm((prev:any) => ({ ...prev, symptoms: s }))}
    />
  );
}
