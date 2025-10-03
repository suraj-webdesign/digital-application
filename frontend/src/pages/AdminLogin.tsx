import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import { Shield, User, Lock, Eye, EyeOff, Wifi, WifiOff, ArrowLeft, AlertTriangle } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showAdminRoleMismatchAlert, setShowAdminRoleMismatchAlert] = useState(false);
  const [adminRoleMismatchMessage, setAdminRoleMismatchMessage] = useState('');
  const [showAdminLoginErrorAlert, setShowAdminLoginErrorAlert] = useState(false);
  const [adminLoginErrorMessage, setAdminLoginErrorMessage] = useState('');

  // Check server connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await ApiService.login(formData.email, formData.password);
      
      // If we reach here, the API call was successful (no error thrown)
      // The API service only returns data if the response is ok
      if (response && response.success) {
        const user = response.data.user;
        const token = response.data.token;
        
        // Verify admin role
        if (user.role !== 'admin') {
          // Show admin role mismatch alert
          setAdminRoleMismatchMessage(`Access denied! This account is registered as ${user.role}. Only administrators can access this portal. Please use the regular login portal.`);
          setShowAdminRoleMismatchAlert(true);
          setIsLoading(false);
          return; // Exit early to prevent login
        }
        
        login(user, token);
        
        toast({
          title: "Admin Login successful!",
          description: `Welcome back, ${user.name}!`,
        });

        navigate('/admin-dashboard');
      } else {
        // This should not happen if API service is working correctly
        throw new Error('Unexpected response from server');
      }
      
    } catch (error) {
      console.error('Admin login error:', error);
      
      // Show admin login error alert popup
      let errorMessage = "Invalid admin credentials. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error cases
        if (error.message.includes('Unable to connect to server')) {
          errorMessage = "Server connection failed. Please check if the backend server is running.";
        } else if (error.message.includes('Invalid credentials')) {
          errorMessage = "Invalid admin email or password. Please check your credentials and try again.";
        } else if (error.message.includes('Account is deactivated')) {
          errorMessage = "Your admin account has been deactivated. Please contact the system administrator.";
        }
      }
      
      setAdminLoginErrorMessage(errorMessage);
      setShowAdminLoginErrorAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        {/* Back to regular login */}
        <div className="mb-4">
          <Link 
            to="/login" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Student/Faculty Login
          </Link>
        </div>

        <Card className="shadow-xl border-red-100">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">Administrator Access</CardTitle>
            <CardDescription className="text-red-600">
              Secure admin login for system management
            </CardDescription>
            
            {/* Connection Status */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              {isConnected === null ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  Checking connection...
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi className="h-4 w-4" />
                  Server connected
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  Server disconnected
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Admin Notice */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Admin Access Only:</strong> This login is restricted to system administrators.
                </p>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter admin email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    className="pl-10 pr-10"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isLoading || isConnected === false}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </>
                ) : isConnected === false ? (
                  <>
                    <WifiOff className="h-4 w-4 mr-2" />
                    Server Offline
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Sign In
                  </>
                )}
              </Button>
              
              {/* Server Disconnected Message */}
              {isConnected === false && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Server Connection Issue:</strong> The backend server is not responding. 
                    Please ensure the server is running on port 5000.
                  </p>
                </div>
              )}
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Security Notice:</strong> Admin access is logged and monitored. 
                Unauthorized access attempts will be reported.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Role Mismatch Alert */}
        {showAdminRoleMismatchAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Admin Access Denied</h3>
                  <p className="text-sm text-red-700 mb-4">
                    {adminRoleMismatchMessage}
                  </p>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowAdminRoleMismatchAlert(false);
                        setAdminRoleMismatchMessage('');
                      }}
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowAdminRoleMismatchAlert(false);
                        setAdminRoleMismatchMessage('');
                        navigate('/login');
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Go to Login
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdminRoleMismatchAlert(false);
                    setAdminRoleMismatchMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Login Error Alert */}
        {showAdminLoginErrorAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Admin Login Failed</h3>
                  <p className="text-sm text-red-700 mb-4">
                    {adminLoginErrorMessage}
                  </p>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setShowAdminLoginErrorAlert(false);
                        setAdminLoginErrorMessage('');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdminLoginErrorAlert(false);
                    setAdminLoginErrorMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
