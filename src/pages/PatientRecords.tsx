import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, FileText, User, Loader2, Plus, StickyNote, Pencil, Trash2, UserCog, File, Download, AlertTriangle, Printer, ChevronLeft, Users } from 'lucide-react';
import AllergyManager from '@/components/cdss/AllergyManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function PatientRecords() {
  const { user, role } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ symptoms: '', diagnosis: '', treatment: '', prescription: '', notes: '', follow_up_date: '' });
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({ full_name: '', email: '', phone: '', student_id: '', gender: '', faculty: '', date_of_birth: '', year_of_study: '' });
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [referralDocs, setReferralDocs] = useState<any[]>([]);

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setPatients(data || []);
  }

  async function selectPatient(patient: any) {
    setSelectedPatient(patient);
    setShowSidebar(false);
    const [recordsRes, visitsRes, docsRes] = await Promise.all([
      supabase.from('medical_records').select('*').eq('patient_id', patient.user_id).order('created_at', { ascending: false }),
      supabase.from('visits').select('*').eq('patient_id', patient.user_id).order('created_at', { ascending: false }),
      supabase.from('referral_documents').select('*').eq('patient_id', patient.user_id).order('created_at', { ascending: false }),
    ]);
    setRecords(recordsRes.data || []);
    setVisits(visitsRes.data || []);
    setReferralDocs(docsRes.data || []);
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisit || !user || !selectedPatient) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_records').insert({
        visit_id: selectedVisit.id,
        patient_id: selectedPatient.user_id,
        staff_id: user.id,
        ...noteForm,
        follow_up_date: noteForm.follow_up_date || null,
      });
      if (error) throw error;
      toast.success('Notes saved successfully');
      setNoteOpen(false);
      setNoteForm({ symptoms: '', diagnosis: '', treatment: '', prescription: '', notes: '', follow_up_date: '' });
      selectPatient(selectedPatient);

      // Notify student
      await supabase.from('notifications').insert({
        user_id: selectedPatient.user_id,
        title: 'New Clinical Notes Added',
        message: `New clinical notes have been added to your record for the visit on ${format(new Date(selectedVisit.created_at), 'MMM dd')}.`,
        type: 'info',
        link: '/my-visits'
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditRecord(record: any) {
    setEditingRecord(record);
    setNoteForm({
      symptoms: record.symptoms || '',
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      prescription: record.prescription || '',
      notes: record.notes || '',
      follow_up_date: record.follow_up_date || '',
    });
    setSelectedVisit({ id: record.visit_id });
    setNoteOpen(true);
  }

  async function updateRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_records').update({
        ...noteForm,
        follow_up_date: noteForm.follow_up_date || null,
      }).eq('id', editingRecord.id);
      if (error) throw error;
      toast.success('Record updated successfully');
      setNoteOpen(false);
      setEditingRecord(null);
      setNoteForm({ symptoms: '', diagnosis: '', treatment: '', prescription: '', notes: '', follow_up_date: '' });
      selectPatient(selectedPatient);

      // Notify student
      await supabase.from('notifications').insert({
        user_id: selectedPatient.user_id,
        title: 'Clinical Record Updated',
        message: `A clinical record in your visit history has been updated.`,
        type: 'info',
        link: '/my-visits'
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord() {
    if (!deleteRecordId) return;
    try {
      const { error } = await supabase.from('medical_records').delete().eq('id', deleteRecordId);
      if (error) throw error;
      toast.success('Record deleted');
      setDeleteRecordId(null);
      selectPatient(selectedPatient);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function startEditPatient() {
    if (!selectedPatient) return;
    setEditPatientForm({
      full_name: selectedPatient.full_name || '',
      email: selectedPatient.email || '',
      phone: selectedPatient.phone || '',
      student_id: selectedPatient.student_id || '',
      gender: selectedPatient.gender || '',
      faculty: selectedPatient.faculty || '',
      date_of_birth: selectedPatient.date_of_birth || '',
      year_of_study: selectedPatient.year_of_study?.toString() || '',
    });
    setEditPatientOpen(true);
  }

  async function updatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    setPatientLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: editPatientForm.full_name,
        email: editPatientForm.email || null,
        phone: editPatientForm.phone || null,
        student_id: editPatientForm.student_id || null,
        gender: editPatientForm.gender || null,
        faculty: editPatientForm.faculty || null,
        date_of_birth: editPatientForm.date_of_birth || null,
        year_of_study: editPatientForm.year_of_study ? parseInt(editPatientForm.year_of_study) : null,
      }).eq('id', selectedPatient.id);
      if (error) throw error;
      toast.success('Student profile updated');
      setEditPatientOpen(false);
      loadPatients();
      // Refresh selected patient
      const { data } = await supabase.from('profiles').select('*').eq('id', selectedPatient.id).maybeSingle();
      if (data) setSelectedPatient(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPatientLoading(false);
    }
  }

  async function deletePatient() {
    if (!deletePatientId) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deletePatientId);
      if (error) throw error;
      toast.success('Student removed from system');
      setDeletePatientId(null);
      setSelectedPatient(null);
      setRecords([]);
      setVisits([]);
      loadPatients();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-2">
          {!showSidebar && (
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)} className="h-10 w-10">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          <h1 className="font-serif text-3xl font-bold">Patient Records</h1>
          {selectedPatient && records.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const csvRows = ['Date,Symptoms,Diagnosis,Treatment,Prescription,Notes,Status'];
                records.forEach(r => csvRows.push(`"${format(new Date(r.created_at), 'yyyy-MM-dd')}","${r.symptoms || ''}","${r.diagnosis || ''}","${r.treatment || ''}","${r.prescription || ''}","${r.notes || ''}","${r.is_referred ? 'Referred' : 'Treated'}"`));
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${selectedPatient.full_name}-records.csv`; a.click();
              }}>
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-8">View patient details and write consultation notes</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          {/* Patient List */}
          <div className={`${showSidebar ? 'lg:col-span-1 block' : 'hidden'} space-y-4`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => selectPatient(patient)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedPatient?.id === patient.id
                      ? 'bg-primary/10 border-primary/40 shadow-sm'
                      : 'bg-card border-border hover:bg-muted/30'
                  }`}
                >
                  <p className="font-medium text-foreground">{patient.full_name || 'Unnamed'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {patient.student_id && <span>{patient.student_id}</span>}
                    {patient.gender && <span>• {patient.gender}</span>}
                    {patient.faculty && <span>• {patient.faculty}</span>}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No patients found.</p>
              )}
            </div>
          </div>

          {/* Patient Details & Records */}
          <div className={`${showSidebar ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all duration-300`}>
            {!selectedPatient ? (
              <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border/60">
                <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-foreground/70">No Patient Selected</h2>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">Select a patient from the list on the left to view their complete medical history and manage records.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!showSidebar && (
                      <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="gap-2">
                        <ChevronLeft className="w-4 h-4" /> Back to List
                      </Button>
                    )}
                  </div>
                </div>
                {/* Patient Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" /> {selectedPatient.full_name}
                    </CardTitle>
                    {(role === 'staff' || role === 'admin') && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={startEditPatient}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeletePatientId(selectedPatient.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Student ID</span>
                        <p className="font-medium">{selectedPatient.student_id || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email</span>
                        <p className="font-medium">{selectedPatient.email || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone</span>
                        <p className="font-medium">{selectedPatient.phone || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gender</span>
                        <p className="font-medium">{selectedPatient.gender || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date of Birth</span>
                        <p className="font-medium">{selectedPatient.date_of_birth ? format(new Date(selectedPatient.date_of_birth), 'MMM dd, yyyy') : '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Faculty</span>
                        <p className="font-medium">{selectedPatient.faculty || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Allergies & Chronic Conditions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="w-5 h-5 text-destructive" /> Allergies & Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AllergyManager patientId={selectedPatient.user_id} />
                  </CardContent>
                </Card>

                {visits.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Button onClick={() => {
                      setSelectedVisit(visits[0]);
                      setNoteOpen(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Notes for Latest Visit
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Latest: {visits[0].chief_complaint} ({format(new Date(visits[0].created_at), 'MMM dd')})
                    </span>
                  </div>
                )}

                {/* Medical Records */}
                <div>
                  <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Medical Records ({records.length})
                  </h3>
                  {records.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No medical records yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {records.map(record => (
                        <Card key={record.id} className="border-border/50">
                          <CardContent className="pt-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className={record.is_referred ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-success/10 text-success border-success/30'}>
                                {record.is_referred ? 'Referred' : 'Treated'}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{format(new Date(record.created_at), 'MMM dd, yyyy HH:mm')}</span>
                                {(role === 'admin' || role === 'staff') && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditRecord(record)}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteRecordId(record.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {record.symptoms && <div><span className="font-medium text-muted-foreground">Symptoms:</span> {record.symptoms}</div>}
                            {record.diagnosis && <div><span className="font-medium text-muted-foreground">Diagnosis:</span> {record.diagnosis}</div>}
                            {record.treatment && <div><span className="font-medium text-muted-foreground">Treatment:</span> {record.treatment}</div>}
                            {record.prescription && <div><span className="font-medium text-muted-foreground">Prescription:</span> {record.prescription}</div>}
                            {record.notes && (
                              <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                                <span className="font-medium text-muted-foreground flex items-center gap-1 mb-1"><StickyNote className="w-3 h-3" /> Notes:</span>
                                <p>{record.notes}</p>
                              </div>
                            )}
                            {record.follow_up_date && <div><span className="font-medium text-muted-foreground">Follow-up:</span> {format(new Date(record.follow_up_date), 'MMM dd, yyyy')}</div>}
                            {record.is_referred && record.referral_hospital && (
                              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                                <p className="font-medium text-destructive">Referred to: {record.referral_hospital}</p>
                                {record.referral_reason && <p className="text-sm mt-1">{record.referral_reason}</p>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referral Documents */}
                {referralDocs.length > 0 && (
                  <div>
                    <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
                      <File className="w-5 h-5" /> Referral Documents ({referralDocs.length})
                    </h3>
                    <div className="space-y-2">
                      {referralDocs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border hover:shadow-sm transition-shadow">
                          <File className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.file_name}</p>
                            {doc.notes && <p className="text-xs text-muted-foreground">{doc.notes}</p>}
                            <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'MMM dd, yyyy HH:mm')}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={async () => {
                            const { data, error } = await supabase.storage.from('referral-documents').download(doc.file_path);
                            if (error) { toast.error('Failed to download'); return; }
                            const url = URL.createObjectURL(data);
                            const a = document.createElement('a');
                            a.href = url; a.download = doc.file_name; a.click();
                            URL.revokeObjectURL(url);
                          }}>
                            <Download className="w-3.5 h-3.5 mr-1" /> Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visit History */}
                <div>
                  <h3 className="font-serif text-lg font-bold mb-4">Visit History ({visits.length})</h3>
                  {visits.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No visits yet.</p>
                  ) : (
                    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Complaint</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map(visit => (
                            <tr key={visit.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">{format(new Date(visit.created_at), 'MMM dd, yyyy')}</td>
                              <td className="py-3 px-4">{visit.chief_complaint}</td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="whitespace-nowrap">{visit.status.replace('_', ' ')}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => { setSelectedVisit(visit); setNoteOpen(true); }}>
                                  <StickyNote className="w-4 h-4 mr-1" /> Add Notes
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Notes Dialog */}
        <Dialog open={noteOpen} onOpenChange={(open) => { setNoteOpen(open); if (!open) { setEditingRecord(null); setNoteForm({ symptoms: '', diagnosis: '', treatment: '', prescription: '', notes: '', follow_up_date: '' }); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Record' : 'Add Notes'} — {selectedPatient?.full_name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={editingRecord ? updateRecord : saveNote} className="space-y-4">
              {selectedVisit && !editingRecord && selectedVisit.chief_complaint && (
                <div className="bg-muted/30 p-3 rounded-lg text-sm border border-border">
                  <span className="font-medium">Visit:</span> {selectedVisit.chief_complaint} — {format(new Date(selectedVisit.created_at), 'MMM dd, yyyy')}
                </div>
              )}
              <div className="space-y-2"><Label>Symptoms</Label><Textarea value={noteForm.symptoms} onChange={e => setNoteForm({...noteForm, symptoms: e.target.value})} placeholder="Observed symptoms" /></div>
              <div className="space-y-2"><Label>Diagnosis</Label><Input value={noteForm.diagnosis} onChange={e => setNoteForm({...noteForm, diagnosis: e.target.value})} placeholder="Diagnosis" /></div>
              <div className="space-y-2"><Label>Treatment</Label><Textarea value={noteForm.treatment} onChange={e => setNoteForm({...noteForm, treatment: e.target.value})} placeholder="Treatment given" /></div>
              <div className="space-y-2"><Label>Prescription</Label><Textarea value={noteForm.prescription} onChange={e => setNoteForm({...noteForm, prescription: e.target.value})} placeholder="Prescribed medication" /></div>
              <div className="space-y-2"><Label>Follow-up Date</Label><Input type="date" value={noteForm.follow_up_date} onChange={e => setNoteForm({...noteForm, follow_up_date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Additional Notes</Label><Textarea value={noteForm.notes} onChange={e => setNoteForm({...noteForm, notes: e.target.value})} placeholder="Any additional notes about the patient" /></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingRecord ? 'Update Record' : 'Save Notes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteRecordId} onOpenChange={(open) => !open && setDeleteRecordId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete medical record?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete this medical record.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Student Dialog */}
        <Dialog open={editPatientOpen} onOpenChange={setEditPatientOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Edit Student Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={updatePatient} className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={editPatientForm.full_name} onChange={e => setEditPatientForm({...editPatientForm, full_name: e.target.value})} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Student ID</Label><Input value={editPatientForm.student_id} onChange={e => setEditPatientForm({...editPatientForm, student_id: e.target.value})} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={editPatientForm.email} onChange={e => setEditPatientForm({...editPatientForm, email: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={editPatientForm.phone} onChange={e => setEditPatientForm({...editPatientForm, phone: e.target.value})} /></div>
                <div className="space-y-2"><Label>Gender</Label><Input value={editPatientForm.gender} onChange={e => setEditPatientForm({...editPatientForm, gender: e.target.value})} placeholder="Male / Female" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Faculty</Label><Input value={editPatientForm.faculty} onChange={e => setEditPatientForm({...editPatientForm, faculty: e.target.value})} /></div>
                <div className="space-y-2"><Label>Year of Study</Label><Input type="number" min="1" max="7" value={editPatientForm.year_of_study} onChange={e => setEditPatientForm({...editPatientForm, year_of_study: e.target.value})} /></div>
              </div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={editPatientForm.date_of_birth} onChange={e => setEditPatientForm({...editPatientForm, date_of_birth: e.target.value})} /></div>
              <Button type="submit" className="w-full" disabled={patientLoading}>
                {patientLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Update Profile
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Student Confirmation */}
        <AlertDialog open={!!deletePatientId} onOpenChange={(o) => { if (!o) setDeletePatientId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove student from system?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this student's profile. Their medical records and visit history will remain but will no longer be linked to a profile.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove Student</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
