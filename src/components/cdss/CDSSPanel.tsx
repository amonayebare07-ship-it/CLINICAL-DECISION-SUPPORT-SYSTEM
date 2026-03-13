import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertTriangle, Pill, Stethoscope, Loader2, ShieldAlert, CheckCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface CDSSPanelProps {
  symptoms: string;
  diagnosis: string;
  prescription: string;
  patientId: string;
  allergies: string[];
  conditions: string[];
  currentMedications: string[];
  medicalHistory?: string;
  onSuggestDiagnosis?: (diagnosis: string) => void;
  onSuggestTreatment?: (treatment: string) => void;
  onSuggestPrescription?: (prescription: string) => void;
}

export default function CDSSPanel({
  symptoms, diagnosis, prescription, patientId,
  allergies, conditions, currentMedications, medicalHistory,
  onSuggestDiagnosis, onSuggestTreatment, onSuggestPrescription,
}: CDSSPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [treatmentResult, setTreatmentResult] = useState<any>(null);
  const [drugCheckResult, setDrugCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function callCDSS(action: string) {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('clinical-decision-support', {
        body: {
          action,
          symptoms,
          diagnosis,
          prescription,
          patient_allergies: allergies,
          patient_conditions: conditions,
          current_medications: currentMedications,
          medical_history: medicalHistory,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (action === 'analyze_symptoms') setAnalysisResult(data.result);
      else if (action === 'recommend_treatment') setTreatmentResult(data.result);
      else if (action === 'check_drug_interactions') setDrugCheckResult(data.result);
    } catch (err: any) {
      toast.error(err.message || 'CDSS analysis failed');
    } finally {
      setLoading(null);
    }
  }

  const severityColor = (s: string) =>
    s === 'high' ? 'bg-destructive/10 text-destructive border-destructive/30' :
    s === 'medium' ? 'bg-warning/10 text-warning border-warning/30' :
    'bg-muted text-muted-foreground';

  const confidenceColor = (c: string) =>
    c === 'high' ? 'bg-success/10 text-success border-success/30' :
    c === 'medium' ? 'bg-warning/10 text-warning border-warning/30' :
    'bg-muted text-muted-foreground';

  return (
    <div className="border border-primary/20 rounded-lg p-4 space-y-4 bg-primary/5">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-5 h-5 text-primary" />
        <span className="text-base font-semibold text-primary">AI Clinical Decision Support</span>
      </div>
      <p className="text-xs text-muted-foreground">AI-powered suggestions to assist clinical decision-making. Not a substitute for medical judgment.</p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!symptoms || !!loading}
          onClick={() => callCDSS('analyze_symptoms')}>
          {loading === 'analyze_symptoms' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Stethoscope className="w-3 h-3 mr-1" />}
          Analyze Symptoms
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!diagnosis || !!loading}
          onClick={() => callCDSS('recommend_treatment')}>
          {loading === 'recommend_treatment' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Pill className="w-3 h-3 mr-1" />}
          Suggest Treatment
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!prescription || !!loading}
          onClick={() => callCDSS('check_drug_interactions')}>
          {loading === 'check_drug_interactions' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
          Check Interactions
        </Button>
      </div>

      {/* Patient safety info */}
      {(allergies.length > 0 || conditions.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {allergies.map((a, i) => (
            <Badge key={`a-${i}`} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
              ⚠ {a}
            </Badge>
          ))}
          {conditions.map((c, i) => (
            <Badge key={`c-${i}`} variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
              {c}
            </Badge>
          ))}
        </div>
      )}

      {/* Symptom Analysis Results */}
      {analysisResult && (
        <Card className="border-primary/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" /> Suggested Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            {analysisResult.triage_level && (
              <Badge variant="outline" className={
                analysisResult.triage_level === 'emergency' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                analysisResult.triage_level === 'urgent' ? 'bg-warning/10 text-warning border-warning/30' :
                'bg-success/10 text-success border-success/30'
              }>
                Triage: {analysisResult.triage_level}
              </Badge>
            )}
            {analysisResult.suggested_diagnoses?.map((d: any, i: number) => (
              <div key={i} className="bg-background rounded-md p-3 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{d.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${confidenceColor(d.confidence)}`}>
                      {d.confidence}
                    </Badge>
                    {onSuggestDiagnosis && (
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-primary"
                        onClick={() => onSuggestDiagnosis(d.name)}>
                        Use
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{d.reasoning}</p>
                {d.medications?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-primary">Recommended Medications:</p>
                    {d.medications.map((m: any, j: number) => (
                      <div key={j} className="text-xs bg-muted/50 p-2 rounded-md border border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m.name}</span>
                          {onSuggestPrescription && (
                            <Button type="button" size="sm" variant="ghost" className="h-5 text-[10px] text-primary"
                              onClick={() => {
                                onSuggestPrescription(`${m.name} ${m.dosage}`);
                                if (onSuggestTreatment) onSuggestTreatment(`${m.name} for ${d.name}`);
                              }}>
                              Add to Rx
                            </Button>
                          )}
                        </div>
                        {m.description && <p className="text-muted-foreground mt-0.5">{m.description}</p>}
                        {m.dosage && <p className="text-muted-foreground font-medium mt-0.5">Dosage: {m.dosage}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {analysisResult.red_flags?.length > 0 && (
              <div className="bg-destructive/5 rounded-md p-3 border border-destructive/20">
                <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3" /> Red Flags
                </p>
                <ul className="text-xs text-destructive/80 space-y-1">
                  {analysisResult.red_flags.map((f: string, i: number) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysisResult.recommended_tests?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Recommended tests:</span> {analysisResult.recommended_tests.join(", ")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Treatment Results */}
      {treatmentResult && (
        <Card className="border-primary/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" /> Treatment Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            {treatmentResult.treatment_plan?.map((t: any, i: number) => (
              <div key={i} className="bg-background rounded-md p-3 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.treatment}</span>
                  {onSuggestTreatment && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-primary"
                      onClick={() => onSuggestTreatment(t.details)}>
                      Use
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.details}</p>
                {t.duration && <p className="text-xs text-muted-foreground">Duration: {t.duration}</p>}
              </div>
            ))}
            {treatmentResult.medications?.map((m: any, i: number) => (
              <div key={i} className="bg-background rounded-md p-2 border border-border/50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.name}</span>
                  {onSuggestPrescription && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-primary"
                      onClick={() => onSuggestPrescription(`${m.name} ${m.dosage} ${m.frequency} for ${m.duration}`)}>
                      Use
                    </Button>
                  )}
                </div>
                {m.description && <p className="text-muted-foreground mt-0.5 mb-1">{m.description}</p>}
                <p className="text-muted-foreground">{m.dosage} — {m.frequency} — {m.duration}</p>
                {m.notes && <p className="text-muted-foreground italic mt-0.5">{m.notes}</p>}
              </div>
            ))}
            {treatmentResult.when_to_refer && (
              <div className="bg-warning/5 rounded-md p-2 border border-warning/20 text-xs">
                <span className="font-medium text-warning">When to refer:</span> {treatmentResult.when_to_refer}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drug Interaction Results */}
      {drugCheckResult && (
        <Card className={`border-2 ${drugCheckResult.safe_to_prescribe ? 'border-success/30' : 'border-destructive/30'}`}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              {drugCheckResult.safe_to_prescribe
                ? <CheckCircle className="w-4 h-4 text-success" />
                : <ShieldAlert className="w-4 h-4 text-destructive" />
              }
              Drug Interaction Check
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <p className="text-sm">{drugCheckResult.summary}</p>
            {drugCheckResult.alerts?.map((a: any, i: number) => (
              <div key={i} className={`rounded-md p-2 border text-xs ${severityColor(a.severity)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-xs ${severityColor(a.severity)}`}>{a.type}</Badge>
                  <span className="font-medium">{a.drug}</span>
                </div>
                <p>{a.message}</p>
                {a.recommendation && <p className="font-medium mt-1">→ {a.recommendation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
