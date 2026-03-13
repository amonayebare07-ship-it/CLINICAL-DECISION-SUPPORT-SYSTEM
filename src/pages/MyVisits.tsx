import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FileText, ArrowRightLeft, AlertCircle, Upload, Loader2, File, Download, Stethoscope, Pill, ClipboardList, Info } from 'lucide-react';

export default function MyVisits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, any>>({});
  const [referralDocs, setReferralDocs] = useState<Record<string, any[]>>({});
  const [uploadOpen, setUploadOpen] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotes, setUploadNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const { data: visitData } = await supabase.from('visits').select('*').eq('patient_id', user.id)
      .order('created_at', { ascending: false });
    setVisits(visitData || []);

    if (visitData && visitData.length > 0) {
      const ids = visitData.map(v => v.id);
      const [recsRes, docsRes] = await Promise.all([
        supabase.from('medical_records').select('*').in('visit_id', ids),
        supabase.from('referral_documents').select('*').in('visit_id', ids).order('created_at', { ascending: false }),
      ]);
      const map: Record<string, any> = {};
      recsRes.data?.forEach(r => { map[r.visit_id] = r; });
      setRecords(map);
      const docMap: Record<string, any[]> = {};
      docsRes.data?.forEach(d => {
        if (!docMap[d.visit_id]) docMap[d.visit_id] = [];
        docMap[d.visit_id].push(d);
      });
      setReferralDocs(docMap);
    }
  }

  async function uploadDocument(visitId: string) {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${visitId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('referral-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('referral_documents').insert({
        visit_id: visitId,
        patient_id: user.id,
        file_name: file.name,
        file_path: filePath,
        notes: uploadNotes || null,
      });
      if (dbError) throw dbError;
      toast.success('Document uploaded successfully');
      setUploadOpen(null);
      setUploadNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function downloadDoc(filePath: string, fileName: string) {
    const { data, error } = await supabase.storage.from('referral-documents').download(filePath);
    if (error) { toast.error('Failed to download'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="font-serif text-3xl font-bold mb-2">My Visits</h1>
        <p className="text-muted-foreground mb-8">Your complete visit history</p>

        {visits.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No visits recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map(visit => {
              const record = records[visit.id];
              return (
                <Card key={visit.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{visit.chief_complaint}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(visit.created_at), 'MMMM dd, yyyy • HH:mm')} — {visit.location}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={
                          visit.status === 'completed' ? 'bg-success/10 text-success border-success/30' :
                          visit.status === 'referred' ? 'bg-warning/10 text-warning border-warning/30' :
                          visit.status === 'waiting' ? 'bg-muted text-muted-foreground border-border' :
                          'bg-info/10 text-info border-info/30'
                        }>{visit.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {record && (
                    <CardContent className="space-y-6 pt-0">
                      <div className="bg-muted/30 rounded-xl p-6 border border-border/50 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-serif font-semibold border-b border-primary/20 pb-2 mb-4">
                          <Stethoscope className="w-5 h-5" />
                          Clinical Feedback
                        </div>
                        
                        {record.diagnosis && (
                          <div className="flex gap-3">
                            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Diagnosis</p>
                              <p className="text-sm font-medium text-foreground">{record.diagnosis}</p>
                            </div>
                          </div>
                        )}

                        {record.treatment && (
                          <div className="flex gap-3">
                            <ClipboardList className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Treatment Given</p>
                              <p className="text-sm text-foreground">{record.treatment}</p>
                            </div>
                          </div>
                        )}

                        {record.prescription && (
                          <div className="flex gap-3">
                            <Pill className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prescription</p>
                              <p className="text-sm font-medium text-primary bg-primary/5 rounded px-2 py-1 mt-1 inline-block">
                                {record.prescription}
                              </p>
                            </div>
                          </div>
                        )}

                        {record.notes && (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Additional Notes</p>
                            <p className="text-sm text-muted-foreground italic leading-relaxed">"{record.notes}"</p>
                          </div>
                        )}

                        {record.follow_up_date && (
                          <div className="mt-2 text-xs font-medium text-destructive bg-destructive/5 rounded-full px-3 py-1 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Follow-up required on: {format(new Date(record.follow_up_date), 'MMMM dd, yyyy')}
                          </div>
                        )}
                      </div>

                      {record.is_referred && (
                        <div className="mt-3 border border-warning/30 bg-warning/5 rounded-xl p-5 space-y-3">
                          <div className="flex items-center gap-2 text-warning font-serif font-bold text-base">
                            <ArrowRightLeft className="w-5 h-5" />
                            Hospital Referral Notice
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Hospital</p>
                              <p className="text-sm font-semibold text-foreground">{record.referral_hospital}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason for Referral</p>
                              <p className="text-sm text-foreground">{record.referral_reason}</p>
                            </div>
                          </div>
                          {record.referral_notes && (
                            <div className="bg-background/80 rounded-lg p-3 border border-warning/20">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Referral Instructions</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{record.referral_notes}</p>
                            </div>
                          )}
                          <Button size="sm" variant="outline" className="w-full mt-2 border-warning/30 hover:bg-warning/10" onClick={() => setUploadOpen(visit.id)}>
                            <Upload className="w-3.5 h-3.5 mr-2" /> Upload Hospital Findings
                          </Button>
                        </div>
                      )}

                      {/* Show uploaded referral documents */}
                      {referralDocs[visit.id] && referralDocs[visit.id].length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-foreground">Uploaded Documents:</p>
                          {referralDocs[visit.id].map(doc => (
                            <div key={doc.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                              <File className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                {doc.notes && <p className="text-xs text-muted-foreground">{doc.notes}</p>}
                                <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'MMM dd, yyyy')}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => downloadDoc(doc.file_path, doc.file_name)}>
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        {/* Upload Dialog */}
        <Dialog open={!!uploadOpen} onOpenChange={(o) => { if (!o) { setUploadOpen(null); setUploadNotes(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Hospital Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document File</Label>
                <Input type="file" ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="e.g. Discharge summary from hospital" />
              </div>
              <Button className="w-full" disabled={uploading} onClick={() => uploadOpen && uploadDocument(uploadOpen)}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
