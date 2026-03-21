import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import InstallPrompt from '../InstallPrompt';
import {
  Home, FileText, Calendar, ClipboardList, Users, Package,
  BarChart3, LogOut, Heart, Stethoscope, FolderOpen, FlaskConical, Settings
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const studentLinks = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/report-illness', icon: ClipboardList, label: 'Report Illness' },
  { to: '/my-visits', icon: FileText, label: 'My Visits' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/lab-results', icon: FlaskConical, label: 'Lab Results' },
  { to: '/profile', icon: Settings, label: 'Profile Settings' },
];

const staffLinks = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/patient-queue', icon: Users, label: 'Patient Queue' },
  { to: '/consultations', icon: Stethoscope, label: 'Consultations' },
  { to: '/patient-records', icon: FolderOpen, label: 'Patient Records' },
  { to: '/lab-results', icon: FlaskConical, label: 'Lab Results' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
];

const adminLinks = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/patient-queue', icon: Users, label: 'Patient Queue' },
  { to: '/consultations', icon: Stethoscope, label: 'Consultations' },
  { to: '/patient-records', icon: FolderOpen, label: 'Patient Records' },
  { to: '/lab-results', icon: FlaskConical, label: 'Lab Results' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/manage-users', icon: Users, label: 'Manage Users' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function AppSidebar() {
  const { role, profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = role === 'admin' ? adminLinks : role === 'staff' ? staffLinks : studentLinks;

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold leading-tight">BBUC CDSS</h1>
            <p className="text-xs opacity-80 capitalize">{role} Portal</p>
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <InstallPrompt />
        <div className="mb-3 px-4">
          <p className="text-sm font-medium truncate">{profile?.full_name || user?.email || 'User'}</p>
          <p className="text-xs opacity-70 truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => { signOut(); navigate('/auth'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground/80"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
