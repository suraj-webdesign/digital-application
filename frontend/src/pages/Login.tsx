import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import { LogIn, User, Lock, Eye, EyeOff, Wifi, WifiOff, Shield, AlertTriangle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student' as 'student' | 'faculty'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showRoleMismatchAlert, setShowRoleMismatchAlert] = useState(false);
  const [roleMismatchMessage, setRoleMismatchMessage] = useState('');
  const [showLoginErrorAlert, setShowLoginErrorAlert] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

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
      console.log('🚀 Login attempt started');
      console.log('Login form data:', formData);
      
      // Use real API call
      const response = await ApiService.login(formData.email, formData.password);
      console.log('📥 Login response:', response);
      console.log('📥 Response type:', typeof response);
      console.log('📥 Response success:', response?.success);
      console.log('📥 Response data:', response?.data);
      console.log('📥 Full response object:', JSON.stringify(response, null, 2));
      
      // If we reach here, the API call was successful (no error thrown)
      // The API service only returns data if the response is ok
      if (response && response.success) {
        console.log('✅ API call successful, processing login...');
        const user = response.data.user;
        const token = response.data.token;
        
        console.log('👤 User data:', user);
        console.log('🔑 Token received:', token ? 'Yes' : 'No');
        
        // Check if user role matches the selected role
        if (user.role !== formData.role) {
          console.log('❌ Role mismatch:', `Expected ${formData.role}, got ${user.role}`);
          
          // Show role mismatch alert
          setRoleMismatchMessage(`Invalid access! This account is registered as ${user.role}. Please select the correct role (${user.role}) and try again.`);
          setShowRoleMismatchAlert(true);
          setIsLoading(false);
          return; // Exit early to prevent login
        }
        
        console.log('✅ Role validation passed');
        
        // Pass both user and token to login function
        login(user, token);
        
        toast({
          title: "Login successful!",
          description: `Welcome back, ${user.name}!`,
        });

        // Redirect based on role
        if (user.role === 'student') {
          navigate('/student-dashboard');
        } else if (user.role === 'faculty') {
          navigate('/faculty-dashboard');
        } else {
          navigate('/');
        }
      } else {
        // This should not happen if API service is working correctly
        console.log('❌ Unexpected response structure');
        console.log('❌ Response:', response);
        throw new Error('Unexpected response from server');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      // Show login error alert popup
      let errorMessage = "Invalid credentials. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error cases
        if (error.message.includes('Unable to connect to server')) {
          errorMessage = "Server connection failed. Please check if the backend server is running.";
        } else if (error.message.includes('Invalid credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes('Account is deactivated')) {
          errorMessage = "Your account has been deactivated. Please contact the administrator.";
        }
      }
      
      setLoginErrorMessage(errorMessage);
      setShowLoginErrorAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'role') {
      // Clear email and password when role changes to prevent confusion
      setFormData(prev => ({ 
        ...prev, 
        role: value as 'student' | 'faculty',
        email: '',
        password: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card-ultra shadow-2xl animate-scale-in">
        <CardHeader className="text-center p-6 sm:p-8">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-float">
            <LogIn className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Welcome Back</CardTitle>
          <CardDescription className="text-base sm:text-lg text-gray-300">
            Sign in to your DocuFlow account to continue
          </CardDescription>
          
          {/* Enhanced Connection Status */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            {isConnected === null ? (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                Checking connection...
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2 text-green-400">
                <Wifi className="h-4 w-4" />
                Server connected
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <WifiOff className="h-4 w-4" />
                Server disconnected
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Ultra Cool Role Selection */}
            <div className="space-y-4">
              <Label htmlFor="role" className="text-base sm:text-lg font-semibold text-white">I am a</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={formData.role === 'student' ? 'default' : 'outline'}
                  onClick={() => handleInputChange('role', 'student')}
                  className={`flex-1 text-base sm:text-lg py-3 rounded-xl transition-all duration-300 ${
                    formData.role === 'student' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Student
                </Button>
                <Button
                  type="button"
                  variant={formData.role === 'faculty' ? 'default' : 'outline'}
                  onClick={() => handleInputChange('role', 'faculty')}
                  className={`flex-1 text-base sm:text-lg py-3 rounded-xl transition-all duration-300 ${
                    formData.role === 'faculty' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Faculty
                </Button>
              </div>
              <div className="p-4 bg-orange-500/20 border border-orange-500/30 rounded-xl shadow-sm">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-300 mb-2">
                      Important: Role Selection Required
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      You can only login with the role you registered with. Selecting the wrong role will show an error popup.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ultra Cool Email Input */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base sm:text-lg font-semibold text-white">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                />
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Ultra Cool Password Input */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base sm:text-lg font-semibold text-white">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  className="pl-12 pr-12 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* Ultra Cool Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              disabled={isLoading || isConnected === false}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-3"></div>
                  <span className="text-base sm:text-lg">Signing in...</span>
                </>
              ) : isConnected === false ? (
                <>
                  <WifiOff className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                  <span className="text-base sm:text-lg">Server Offline</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                  <span className="text-base sm:text-lg">Sign In</span>
                </>
              )}
            </Button>
            
            {/* Ultra Cool Server Disconnected Message */}
            {isConnected === false && (
              <div className="p-4 bg-red-500/20 border-2 border-red-500/30 rounded-xl shadow-sm">
                <p className="text-sm text-red-300 font-medium">
                  <strong>Server Connection Issue:</strong> The backend server is not responding. 
                  Please ensure the server is running on port 5000.
                </p>
              </div>
            )}
          </form>

          {/* Ultra Cool Forgot Password Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/forgot-password" 
              className="text-base text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Ultra Cool Sign Up Section */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-base text-gray-300">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors duration-200">
                Sign up
              </Link>
            </p>
            <div className="text-sm text-gray-300 p-4 bg-white/10 rounded-xl border border-white/20 shadow-sm">
              <p className="font-semibold text-white mb-2">Need Administrator Access?</p>
              <p className="text-sm mb-3 text-gray-300">Administrators have a separate secure login portal.</p>
              <Link 
                to="/admin-login" 
                className="inline-flex items-center text-sm text-red-400 hover:text-red-300 font-semibold transition-colors duration-200"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Login Portal
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Role Mismatch Alert */}
      {showRoleMismatchAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-scale-in">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-3">Role Mismatch</h3>
                <p className="text-base text-red-700 mb-6 leading-relaxed">
                  {roleMismatchMessage}
                </p>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      setShowRoleMismatchAlert(false);
                      setRoleMismatchMessage('');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRoleMismatchAlert(false);
                  setRoleMismatchMessage('');
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Login Error Alert */}
      {showLoginErrorAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-scale-in">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-3">Login Failed</h3>
                <p className="text-base text-red-700 mb-6 leading-relaxed">
                  {loginErrorMessage}
                </p>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      setShowLoginErrorAlert(false);
                      setLoginErrorMessage('');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLoginErrorAlert(false);
                  setLoginErrorMessage('');
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;