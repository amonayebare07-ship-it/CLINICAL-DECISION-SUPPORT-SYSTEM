import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import campusBg from '@/assets/bbu-campus-7.png';

type SignupRole = 'student' | 'staff' | 'admin';

const FACULTIES = [
  'Faculty of Science and Technology',
  'Faculty of Business and Administration',
  'Faculty of Education and Arts',
  'Faculty of Law',
  'Faculty of Social Sciences',
];

const GENDERS = ['Male', 'Female'];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [signupRole, setSignupRole] = useState<SignupRole>('student');
  const [faculty, setFaculty] = useState('');
  const [gender, setGender] = useState('');
  const [course, setCourse] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent! Check your email.');
      setShowForgot(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              student_id: signupRole === 'admin' ? 'ADMIN-REQ' : (signupRole === 'student' ? studentId : null),
              signup_role: signupRole === 'admin' ? 'student' : signupRole,
              requested_admin: signupRole === 'admin',
              faculty: signupRole === 'admin' ? 'Admin Request' : (signupRole === 'student' ? faculty : null),
              gender,
              course: signupRole === 'student' ? course : null,
            },
          },
        });
        if (error) throw error;
        if (signupRole === 'admin') {
          toast.success('Admin account requested. Please wait for the Super Admin to manually approve your access.', { duration: 5000 });
        } else {
          toast.success('Account created! Welcome to BBUC CDSS.');
        }
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${campusBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
           <h1 className="font-serif text-3xl font-bold text-foreground">BBUC CDSS</h1>
          <p className="text-muted-foreground mt-1">Bishop Barham University College Kabale — Clinical Decision Support System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? 'Sign In' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Enter your credentials to access the system' : 'Register with your UCU student details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label>I am registering as</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={signupRole === 'student' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setSignupRole('student')}
                      >
                        Student
                      </Button>
                      <Button
                        type="button"
                        variant={signupRole === 'staff' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setSignupRole('staff')}
                      >
                        Nurse / Staff
                      </Button>
                      <Button
                        type="button"
                        variant={signupRole === 'admin' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setSignupRole('admin')}
                      >
                        Admin
                      </Button>
                    </div>
                  </div>
                  
                  {signupRole === 'admin' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg flex gap-2 items-start mt-2">
                      <Shield className="w-5 h-5 shrink-0 text-amber-600" />
                      <p><strong>Manual Approval Required:</strong> Admin accounts must be approved by the Super Admin (Amon@gmail.com). You will have basic system access until manually upgraded.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="John Doe" />
                  </div>
                  {signupRole === 'student' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input id="studentId" value={studentId} onChange={e => setStudentId(e.target.value)} required placeholder="e.g. UCU/2024/001" />
                      </div>
                      <div className="space-y-2">
                        <Label>Faculty</Label>
                        <Select value={faculty} onValueChange={setFaculty} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your faculty" />
                          </SelectTrigger>
                          <SelectContent>
                            {FACULTIES.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course">Course</Label>
                        <Input id="course" value={course} onChange={e => setCourse(e.target.value)} required placeholder="e.g. Bachelor of Science in IT" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Sex</Label>
                    <Select value={gender} onValueChange={setGender} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your sex" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
              {isLogin && (
                <div className="mt-2">
                  <button onClick={() => setShowForgot(true)} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                    Forgot your password?
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Card className="w-full max-w-sm mx-4">
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>Enter your email to receive a password reset link</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">Email</Label>
                    <Input id="forgotEmail" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required placeholder="you@example.com" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForgot(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={forgotLoading}>
                      {forgotLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send Link
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
