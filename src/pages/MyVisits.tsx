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
import { FileText, ArrowRightLeft, AlertCircle, Upload, Loader2, File, Download } from 'lucide-react';

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
                    <CardContent className="space-y-3">
                      {record.diagnosis && (
                        <div><span className="text-sm font-medium text-foreground">Diagnosis:</span> <span className="text-sm text-muted-foreground">{record.diagnosis}</span></div>
                      )}
                      {record.treatment && (
                        <div><span className="text-sm font-medium text-foreground">Treatment:</span> <span className="text-sm text-muted-foreground">{record.treatment}</span></div>
                      )}
                      {record.prescription && (
                        <div><span className="text-sm font-medium text-foreground">Prescription:</span> <span className="text-sm text-muted-foreground">{record.prescription}</span></div>
                      )}
                      {record.notes && (
                        <div><span className="text-sm font-medium text-foreground">Notes:</span> <span className="text-sm text-muted-foreground">{record.notes}</span></div>
                      )}
                      {record.follow_up_date && (
                        <div><span className="text-sm font-medium text-foreground">Follow-up:</span> <span className="text-sm text-muted-foreground">{format(new Date(record.follow_up_date), 'MMMM dd, yyyy')}</span></div>
                      )}

                      {record.is_referred && (
                        <div className="mt-3 border border-warning/30 bg-warning/5 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-warning font-semibold">
                            <ArrowRightLeft className="w-4 h-4" />
                            Referral Notice
                          </div>
                          <div><span className="text-sm font-medium text-foreground">Hospital:</span> <span className="text-sm text-muted-foreground">{record.referral_hospital}</span></div>
                          <div><span className="text-sm font-medium text-foreground">Reason:</span> <span className="text-sm text-muted-foreground">{record.referral_reason}</span></div>
                          {record.referral_notes && (
                            <div className="flex items-start gap-2 mt-2 bg-background/50 rounded p-3 border border-border">
                              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-sm text-muted-foreground">{record.referral_notes}</p>
                            </div>
                          )}
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => setUploadOpen(visit.id)}>
                            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Hospital Document
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
