
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LogoutPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await signOut();
        toast.success('You have been logged out successfully');
        // Redirect to login page after logout
        navigate('/auth');
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Failed to log out. Please try again.');
        navigate('/dashboard');
      }
    };

    performLogout();
  }, [signOut, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
};

export default LogoutPage;
