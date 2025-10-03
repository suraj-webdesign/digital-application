import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import { UserPlus, User, Lock, Eye, EyeOff, Mail, Building } from 'lucide-react';

// Available departments
const DEPARTMENTS = [
  'Computer Science',
  'Electronics and Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Information Science',
  'Aerospace Engineering',
  'Chemical Engineering'
];

// Available designations for faculty
const FACULTY_DESIGNATIONS = [
  'Mentor',
  'HOD',
  'Dean',
  'Assistant Professor',
  'Professor'
];

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'faculty',
    vtuId: '',
    facultyId: '',
    designation: '',
    department: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Registration form submitted');
    console.log('Form data:', formData);
    
    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Password mismatch');
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      console.log('❌ Password too short');
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      console.log('❌ Invalid email format');
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Validate name
    if (formData.name.trim().length < 2) {
      console.log('❌ Name too short');
      toast({
        title: "Name too short",
        description: "Please enter your full name (at least 2 characters).",
        variant: "destructive"
      });
      return;
    }

    // Validate role-specific fields
    if (formData.role === 'student') {
      if (!formData.vtuId.trim()) {
        console.log('❌ Missing VTU ID');
        toast({
          title: "VTU ID required",
          description: "Please enter your VTU ID.",
          variant: "destructive"
        });
        return;
      }
      // Basic VTU ID format validation (should start with letters and contain numbers)
      if (!/^[A-Za-z]{2,}\d+$/.test(formData.vtuId.trim())) {
        console.log('❌ Invalid VTU ID format');
        toast({
          title: "Invalid VTU ID format",
          description: "VTU ID should contain letters followed by numbers (e.g., VTU123456).",
          variant: "destructive"
        });
        return;
      }
    }

    if (formData.role === 'faculty') {
      if (!formData.facultyId.trim()) {
        console.log('❌ Missing Faculty ID');
        toast({
          title: "Faculty ID required",
          description: "Please enter your Faculty ID.",
          variant: "destructive"
        });
        return;
      }
      // Basic Faculty ID format validation
      if (formData.facultyId.trim().length < 3) {
        console.log('❌ Faculty ID too short');
        toast({
          title: "Faculty ID too short",
          description: "Faculty ID should be at least 3 characters long.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Validate department is selected
      if (!formData.department.trim()) {
        console.log('❌ Missing department');
        toast({
          title: "Department required",
          description: "Please select your department.",
          variant: "destructive"
        });
        return;
      }

      // Validate designation for faculty
      if (formData.role === 'faculty' && !formData.designation.trim()) {
        console.log('❌ Missing designation');
        toast({
          title: "Designation required",
          description: "Please select your designation.",
          variant: "destructive"
        });
        return;
      }

      // Prepare registration data
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        vtuId: formData.role === 'student' ? formData.vtuId : undefined,
        facultyId: formData.role === 'faculty' ? formData.facultyId : undefined,
        designation: formData.role === 'faculty' ? formData.designation : undefined,
        department: formData.department // Department for both students and faculty
      };

      console.log('📤 Sending registration data:', registrationData);

      // Use real API call
      const response = await ApiService.register(registrationData);
      
      console.log('📥 Registration response:', response);
      
      if (response.success) {
        const user = response.data.user;
        const token = response.data.token;
        
        // Pass both user and token to login function
        login(user, token);
        
        toast({
          title: "Registration successful!",
          description: `Welcome to DDAS, ${user.name}!`,
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
        throw new Error(response.message || 'Registration failed');
      }
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'role') {
      // Clear role-specific fields when role changes
      setFormData(prev => ({ 
        ...prev, 
        role: value as 'student' | 'faculty',
        vtuId: '',
        facultyId: '',
        designation: '',
        department: '' // Clear department when role changes
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card-ultra shadow-2xl">
        <CardHeader className="text-center p-6 sm:p-8">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-float">
            <UserPlus className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Create Account</CardTitle>
          <CardDescription className="text-base sm:text-lg text-gray-300">
            Join DocuFlow to streamline your document approval process
          </CardDescription>
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
            </div>

            {/* Ultra Cool Name Input */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-base sm:text-lg font-semibold text-white">Full Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                />
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Ultra Cool Email Input */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base sm:text-lg font-semibold text-white">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Ultra Cool VTU ID Input - Only for Students */}
            {formData.role === 'student' && (
              <div className="space-y-3">
                <Label htmlFor="vtuId" className="text-base sm:text-lg font-semibold text-white">VTU ID</Label>
                <div className="relative">
                  <Input
                    id="vtuId"
                    type="text"
                    placeholder="Enter your VTU ID"
                    value={formData.vtuId}
                    onChange={(e) => handleInputChange('vtuId', e.target.value)}
                    required
                    className="pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}

            {/* Ultra Cool Faculty ID Input - Only for Faculty */}
            {formData.role === 'faculty' && (
              <div className="space-y-3">
                <Label htmlFor="facultyId" className="text-base sm:text-lg font-semibold text-white">Faculty ID</Label>
                <div className="relative">
                  <Input
                    id="facultyId"
                    type="text"
                    placeholder="Enter your Faculty ID"
                    value={formData.facultyId}
                    onChange={(e) => handleInputChange('facultyId', e.target.value)}
                    required
                    className="pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}

            {/* Ultra Cool Department Selection - For Both Students and Faculty */}
            <div className="space-y-3">
              <Label htmlFor="department" className="text-base sm:text-lg font-semibold text-white">Department *</Label>
              <div className="relative">
                <select 
                  value={formData.department} 
                  onChange={(e) => {
                    console.log('Department selected:', e.target.value);
                    handleInputChange('department', e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 appearance-none cursor-pointer"
                  required
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 12px center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="" className="bg-gray-800 text-white">Select your department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-gray-800 text-white">
                      {dept}
                    </option>
                  ))}
                </select>
                <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-300">
                Current selection: {formData.department || 'None'}
              </p>
            </div>

            {/* Ultra Cool Designation Selection - Only for Faculty */}
            {formData.role === 'faculty' && (
              <div className="space-y-3">
                <Label htmlFor="designation" className="text-base sm:text-lg font-semibold text-white">Designation *</Label>
                <div className="relative">
                  <select 
                    value={formData.designation} 
                    onChange={(e) => {
                      console.log('Designation selected:', e.target.value);
                      handleInputChange('designation', e.target.value);
                    }}
                    className="w-full pl-12 pr-4 py-3 text-base sm:text-lg rounded-xl bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 appearance-none cursor-pointer"
                    required
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px'
                    }}
                  >
                    <option value="" className="bg-gray-800 text-white">Select your designation</option>
                    {FACULTY_DESIGNATIONS.map((designation) => (
                      <option key={designation} value={designation} className="bg-gray-800 text-white">
                        {designation}
                      </option>
                    ))}
                  </select>
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-300">
                  Current selection: {formData.designation || 'None'}
                </p>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  className="pl-10 pr-10"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in here
              </Link>
            </div>

            {/* Contact Admin Section */}
            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              <p className="mb-2">Need administrator access?</p>
              <p className="text-xs">
                Contact the system administrator for admin account setup
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;