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
  onAutoFill?: (data: { 
    diagnosis?: string; 
    treatment?: string; 
    prescription?: string;
    follow_up_date?: string;
    notes?: string;
  }) => void;
  onUpdateSymptoms?: (symptoms: string) => void;
}

export default function CDSSPanel({
  symptoms, diagnosis, prescription, patientId,
  allergies, conditions, currentMedications, medicalHistory,
  onSuggestDiagnosis, onSuggestTreatment, onSuggestPrescription, onAutoFill, onUpdateSymptoms,
}: CDSSPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [treatmentResult, setTreatmentResult] = useState<any>(null);
  const [drugCheckResult, setDrugCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  async function callCDSS(action: string, voiceTranscript?: string) {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('clinical-decision-support', {
        body: {
          action,
          symptoms: action === 'voice_analyze' ? voiceTranscript : symptoms,
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

      console.log(`CDSS ${action} result:`, data.result);

      if (action === 'analyze_symptoms') setAnalysisResult(data.result);
      else if (action === 'recommend_treatment') setTreatmentResult(data.result);
      else if (action === 'check_drug_interactions') setDrugCheckResult(data.result);
      else if (action === 'voice_analyze') {
        if (data.result.refined_symptoms && onUpdateSymptoms) {
          onUpdateSymptoms(data.result.refined_symptoms);
        }
        setAnalysisResult(data.result.analysis);
        setTreatmentResult(data.result.treatment);
      }
    } catch (err: any) {
      toast.error(err.message || 'CDSS analysis failed');
    } finally {
      setLoading(null);
    }
  }

  function toggleRecording() {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    const newRecognition = new SpeechRecognition();
    newRecognition.continuous = false;
    newRecognition.interimResults = false;
    newRecognition.lang = 'en-US';

    newRecognition.onstart = () => {
      setIsRecording(true);
      toast.info('Recording... Speak symptoms, diagnosis, and prescription details.');
    };

    newRecognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (onUpdateSymptoms) onUpdateSymptoms(transcript);
      callCDSS('voice_analyze', transcript);
    };

    newRecognition.onerror = (event: any) => {
      setIsRecording(false);
      toast.error('Speech recognition error: ' + event.error);
    };

    newRecognition.onend = () => {
      setIsRecording(false);
    };

    setRecognition(newRecognition);
    newRecognition.start();
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
        <Button type="button" size="sm" variant="outline" disabled={!!loading}
          onClick={() => {
            if (!diagnosis) {
              toast.info('Suggesting treatment based on provided symptoms...');
            }
            callCDSS('recommend_treatment');
          }}>
          {loading === 'recommend_treatment' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Pill className="w-3 h-3 mr-1" />}
          Suggest Treatment
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!!loading}
          onClick={() => {
            if (!prescription) {
              toast.error('Please enter a prescription to check for interactions.');
              return;
            }
            callCDSS('check_drug_interactions');
          }}>
          {loading === 'check_drug_interactions' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
          Check Interactions
        </Button>
        <Button 
          type="button" 
          size="sm" 
          variant={isRecording ? "destructive" : "secondary"}
          disabled={!!loading}
          onClick={toggleRecording}
          className={isRecording ? "animate-pulse" : ""}
        >
          {loading === 'voice_analyze' ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : isRecording ? (
            <Activity className="w-3 h-3 mr-1" />
          ) : (
            <Brain className="w-3 h-3 mr-1" />
          )}
          {isRecording ? "Stop Recording" : "Record Voice"}
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

      {/* Smart Auto-fill Button */}
      {(analysisResult || treatmentResult) && onAutoFill && (
        <Button 
          type="button" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center gap-2"
          onClick={() => {
            const data: any = {};
            
            if (analysisResult?.suggested_diagnoses?.length > 0) {
              const topDiagnosis = analysisResult.suggested_diagnoses[0];
              data.diagnosis = topDiagnosis.name;
              
              if (topDiagnosis.medications?.length > 0) {
                data.prescription = topDiagnosis.medications.map((m: any) => `${m.name} ${m.dosage || ''}`).join('\n');
              }
            }

            if (treatmentResult?.treatment_plan?.length > 0) {
              data.treatment = treatmentResult.treatment_plan.map((t: any) => t.details).join('\n');
            }

            if (treatmentResult?.medications?.length > 0) {
              const meds = treatmentResult.medications.map((m: any) => `${m.name} ${m.dosage} ${m.frequency} for ${m.duration}`).join('\n');
              data.prescription = data.prescription ? `${data.prescription}\n${meds}` : meds;
            }

            if (analysisResult?.symptomatic_relief?.length > 0) {
              const symptomsMeds = analysisResult.symptomatic_relief.map((s: any) => `${s.medication} ${s.dosage || ''}`).join('\n');
              data.prescription = data.prescription ? `${data.prescription}\n${symptomsMeds}` : symptomsMeds;
            }

            // Autofill follow-up and notes
            data.follow_up_date = treatmentResult?.follow_up_date || analysisResult?.follow_up_date;
            data.notes = treatmentResult?.additional_notes || analysisResult?.additional_notes;

            onAutoFill(data);
            toast.success('Record auto-filled with AI recommendations');
          }}
        >
          <Brain className="w-4 h-4" /> Smart Auto-fill Record
        </Button>
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
            {analysisResult.suggested_diagnoses?.map((d: any, i: number) => {
              const meds = d.medications || d.medication || [];
              return (
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
                  {meds.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-primary">Recommended Medications:</p>
                      {meds.map((m: any, j: number) => (
                        <div key={j} className="text-xs bg-muted/50 p-2 rounded-md border border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{m.name}</span>
                            {onSuggestPrescription && (
                              <Button type="button" size="sm" variant="ghost" className="h-5 text-[10px] text-primary"
                                onClick={() => {
                                  onSuggestPrescription(`${m.name} ${m.dosage || ''}`);
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
              );
            })}
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
              <div className="text-xs text-muted-foreground pb-2 border-b border-border/50">
                <span className="font-medium">Recommended tests:</span> {analysisResult.recommended_tests.join(", ")}
              </div>
            )}
            {analysisResult.symptomatic_relief?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Symptomatic Relief
                </p>
                <div className="space-y-2">
                  {analysisResult.symptomatic_relief.map((s: any, i: number) => (
                    <div key={i} className="bg-background rounded-md p-2 border border-border/50 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span>{s.medication}</span>
                        {onSuggestPrescription && (
                          <Button type="button" size="sm" variant="ghost" className="h-5 text-[10px] text-primary"
                            onClick={() => onSuggestPrescription(`${s.medication} ${s.dosage || ''}`)}>
                            Add to Rx
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[10px]">For: {s.symptom}</p>
                      {s.reasoning && <p className="text-muted-foreground italic mt-1">{s.reasoning}</p>}
                    </div>
                  ))}
                </div>
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
