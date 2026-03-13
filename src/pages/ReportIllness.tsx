import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const COMMON_SYMPTOMS = [
  'Fever', 'Headache', 'Cough', 'Sore Throat', 'Body Aches', 
  'Fatigue', 'Nausea', 'Vomiting', 'Diarrhea', 'Stomach Pain', 
  'Dizziness', 'Rash', 'Shortness of Breath', 'Chest Pain',
  'Joint Pain', 'Loss of Taste/Smell'
];

export default function ReportIllness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [priority, setPriority] = useState('normal');
  const [location, setLocation] = useState('');
  const [areaOfResidence, setAreaOfResidence] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const next = prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom];
      
      // Update the complaint field automatically
      setComplaint(next.join(', '));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !complaint.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('visits').insert({
        patient_id: user.id,
        chief_complaint: complaint.trim(),
        priority,
        location,
        status: 'waiting',
      });
      if (error) throw error;
      toast.success('Your visit has been registered. A medical staff will attend to you shortly.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="font-serif text-3xl font-bold mb-2">Report Illness</h1>
        <p className="text-muted-foreground mb-8">Describe your symptoms and we'll get you help as soon as possible.</p>

        <Card>
          <CardHeader>
            <CardTitle>Visit Details</CardTitle>
            <CardDescription>Fill in the details below to check into the sick bay</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label>Select Symptoms</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMMON_SYMPTOMS.map(s => (
                    <Badge
                      key={s}
                      variant={selectedSymptoms.includes(s) ? 'default' : 'outline'}
                      className="cursor-pointer py-2 justify-center hover:bg-primary/10 transition-colors"
                      onClick={() => toggleSymptom(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaint">Chief Complaint / Detailed Symptoms *</Label>
                <Textarea
                  id="complaint"
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                  required
                  placeholder="Describe your symptoms (e.g., headache, fever, stomach pain...)"
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor issue</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High - Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g., Main Campus Sick Bay, Library..."
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="residence">Area of Residence</Label>
                <Input
                  id="residence"
                  value={areaOfResidence}
                  onChange={e => setAreaOfResidence(e.target.value)}
                  placeholder="e.g., Mukono, Kampala, Bishop Tucker Hall..."
                  maxLength={200}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Report
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
