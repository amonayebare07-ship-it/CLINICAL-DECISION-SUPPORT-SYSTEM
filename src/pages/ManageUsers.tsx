import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Users, Search, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageUsers() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === 'amon@gmail.com';

  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [deleteUser, setDeleteUser] = useState<any>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data: profs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setProfiles(profs || []);
    const { data: roleData } = await supabase.from('user_roles').select('*');
    const map: Record<string, string> = {};
    roleData?.forEach(r => { map[r.user_id] = r.role; });
    setRoles(map);
  }

  async function changeRole(userId: string, newRole: string) {
    try {
      // Check if role exists
      const existing = roles[userId];
      if (existing) {
        const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
        if (error) throw error;
      }
      setRoles(prev => ({ ...prev, [userId]: newRole }));
      toast.success(`Role updated to ${newRole}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function removeUser() {
    if (!deleteUser) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteUser.id);
      if (error) throw error;
      toast.success('User removed');
      setDeleteUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive border-destructive/30',
    staff: 'bg-info/10 text-info border-info/30',
    student: 'bg-primary/10 text-primary border-primary/30',
  };

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="font-serif text-3xl font-bold mb-2">Manage Users</h1>
        <p className="text-muted-foreground mb-6">{profiles.length} registered users</p>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student ID</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Faculty</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium flex items-center gap-2">
                        <span>{p.full_name || '—'}</span>
                        {p.student_id === 'ADMIN-REQ' && roles[p.user_id] !== 'admin' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 h-5">
                            Wants Admin
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">{p.email}</td>
                      <td className="py-3 px-4">{p.student_id || '—'}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[150px] truncate">{p.faculty || '—'}</td>
                      <td className="py-3 px-4">
                        <Select 
                          value={roles[p.user_id] || 'student'} 
                          onValueChange={(v) => changeRole(p.user_id, v)}
                          disabled={!isSuperAdmin && (roles[p.user_id] === 'admin' || p.email?.toLowerCase() === 'amon@gmail.com')}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:hover:bg-transparent" 
                          onClick={() => setDeleteUser(p)}
                          disabled={p.email?.toLowerCase() === 'amon@gmail.com' || (!isSuperAdmin && roles[p.user_id] === 'admin')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <strong>{deleteUser?.full_name}</strong> from the system. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={removeUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
