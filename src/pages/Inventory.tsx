import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Package, AlertTriangle, Loader2, Pencil, Trash2 } from 'lucide-react';

export default function Inventory() {
  const { role } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', quantity: '0', unit: 'tablets', reorder_level: '10', expiry_date: '' });

  const canManage = role === 'admin' || role === 'staff';

  useEffect(() => { loadInventory(); }, []);

  async function loadInventory() {
    const { data } = await supabase.from('medication_inventory').select('*').order('name');
    setItems(data || []);
  }

  function openAdd() {
    setEditItem(null);
    setForm({ name: '', description: '', quantity: '0', unit: 'tablets', reorder_level: '10', expiry_date: '' });
    setOpen(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      quantity: String(item.quantity),
      unit: item.unit,
      reorder_level: String(item.reorder_level),
      expiry_date: item.expiry_date || '',
    });
    setOpen(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        quantity: parseInt(form.quantity),
        unit: form.unit,
        reorder_level: parseInt(form.reorder_level),
        expiry_date: form.expiry_date || null,
      };
      if (editItem) {
        const { error } = await supabase.from('medication_inventory').update(payload).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { error } = await supabase.from('medication_inventory').insert(payload);
        if (error) throw error;
        toast.success('Item added');
      }
      setOpen(false);
      loadInventory();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('medication_inventory').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Item deleted');
    loadInventory();
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2">Medication Inventory</h1>
            <p className="text-muted-foreground">Track medications and supplies</p>
          </div>
          {canManage && (
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? 'Edit Medication' : 'Add Medication'}</DialogTitle></DialogHeader>
            <form onSubmit={saveItem} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} /></div>
                <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editItem ? 'Update' : 'Add'} Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {items.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No items in inventory.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Unit</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expiry</th>
                  {canManage && <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const lowStock = item.quantity <= item.reorder_level;
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4">{item.quantity}</td>
                      <td className="py-3 px-4">{item.unit}</td>
                      <td className="py-3 px-4">
                        {lowStock ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.expiry_date ? format(new Date(item.expiry_date), 'MMM dd, yyyy') : '—'}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}