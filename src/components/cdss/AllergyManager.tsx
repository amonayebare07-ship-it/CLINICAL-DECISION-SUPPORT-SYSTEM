import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AllergyManagerProps {
  patientId: string;
  readonly?: boolean;
}

interface Allergy {
  id: string;
  allergy_type: string;
  name: string;
  severity: string;
  notes: string | null;
}

interface Condition {
  id: string;
  condition_name: string;
  status: string;
  diagnosed_date: string | null;
  notes: string | null;
}

export default function AllergyManager({ patientId, readonly = false }: AllergyManagerProps) {
  const { user } = useAuth();
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);

  // Allergy form
  const [allergyName, setAllergyName] = useState('');
  const [allergyType, setAllergyType] = useState('medication');
  const [allergySeverity, setAllergySeverity] = useState('mild');

  // Condition form
  const [conditionName, setConditionName] = useState('');
  const [conditionStatus, setConditionStatus] = useState('active');

  useEffect(() => { loadData(); }, [patientId]);

  async function loadData() {
    setLoading(true);
    const [allergiesRes, conditionsRes] = await Promise.all([
      supabase.from('patient_allergies' as any).select('*').eq('patient_id', patientId).order('created_at'),
      supabase.from('patient_conditions' as any).select('*').eq('patient_id', patientId).order('created_at'),
    ]);
    setAllergies((allergiesRes.data as any[]) || []);
    setConditions((conditionsRes.data as any[]) || []);
    setLoading(false);
  }

  async function addAllergy() {
    if (!allergyName.trim() || !user) return;
    const { error } = await supabase.from('patient_allergies' as any).insert({
      patient_id: patientId,
      name: allergyName.trim(),
      allergy_type: allergyType,
      severity: allergySeverity,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Allergy added');
    setAllergyName('');
    loadData();
  }

  async function removeAllergy(id: string) {
    const { error } = await supabase.from('patient_allergies' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Allergy removed');
    loadData();
  }

  async function addCondition() {
    if (!conditionName.trim() || !user) return;
    const { error } = await supabase.from('patient_conditions' as any).insert({
      patient_id: patientId,
      condition_name: conditionName.trim(),
      status: conditionStatus,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Condition added');
    setConditionName('');
    loadData();
  }

  async function removeCondition(id: string) {
    const { error } = await supabase.from('patient_conditions' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Condition removed');
    loadData();
  }

  const severityColor = (s: string) =>
    s === 'severe' ? 'bg-destructive/10 text-destructive border-destructive/30' :
    s === 'moderate' ? 'bg-warning/10 text-warning border-warning/30' :
    'bg-muted text-muted-foreground';

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Allergies Section */}
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> Allergies ({allergies.length})
        </h4>
        {allergies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {allergies.map(a => (
              <Badge key={a.id} variant="outline" className={`${severityColor(a.severity)} text-xs`}>
                ⚠ {a.name} ({a.allergy_type})
                {!readonly && (
                  <button onClick={() => removeAllergy(a.id)} className="ml-1 hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        {!readonly && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input size={1} value={allergyName} onChange={e => setAllergyName(e.target.value)}
                placeholder="e.g. Penicillin" className="h-8 text-xs" />
            </div>
            <Select value={allergyType} onValueChange={setAllergyType}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medication">Medication</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={allergySeverity} onValueChange={setAllergySeverity}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={addAllergy} disabled={!allergyName.trim()}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Chronic Conditions Section */}
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-warning" /> Chronic Conditions ({conditions.length})
        </h4>
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {conditions.map(c => (
              <Badge key={c.id} variant="outline" className={`text-xs ${c.status === 'active' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-muted text-muted-foreground'}`}>
                {c.condition_name} ({c.status})
                {!readonly && (
                  <button onClick={() => removeCondition(c.id)} className="ml-1 hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        {!readonly && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input value={conditionName} onChange={e => setConditionName(e.target.value)}
                placeholder="e.g. Asthma, Diabetes" className="h-8 text-xs" />
            </div>
            <Select value={conditionStatus} onValueChange={setConditionStatus}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="managed">Managed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={addCondition} disabled={!conditionName.trim()}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
