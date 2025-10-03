import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, FileText, Home, Settings, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import ThemeToggle from '@/components/ThemeToggle';
import ProfileEditor from '@/components/ProfileEditor';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Call API logout if user is authenticated
      if (isAuthenticated) {
        await ApiService.logout();
      }
      
      // Clear local state
      logout();
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if API logout fails, clear local state
      logout();
      
      toast({
        title: "Logged out",
        description: "You have been logged out of your account.",
      });
      
      navigate('/');
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Ultra Modern Glass Morphism Header */}
      <header className="glass-card-ultra sticky top-0 z-50 mx-4 mt-4 mb-6 animate-fade-in">
        <div className="container-responsive">
          <div className="flex items-center justify-between h-20">
            {/* Super Cool Logo and Brand */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/" className="flex items-center space-x-4 group hover-scale">
                <div className="relative">
                  <div className="p-4 rounded-3xl shadow-2xl group-hover:scale-110 transition-all duration-500 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    DocuFlow
                  </span>
                  <p className="text-sm text-gray-300 -mt-1 font-medium">Document Approval System</p>
                </div>
                <div className="sm:hidden">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    DocuFlow
                  </span>
                </div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            {isAuthenticated && (
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </div>
            )}

            {/* Ultra Cool Navigation Links */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center space-x-2">
                <Link
                  to="/"
                  className={`relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                    isActiveRoute('/') 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </div>
                  {isActiveRoute('/') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-30"></div>
                  )}
                </Link>
                
                {user?.role === 'student' && (
                  <Link
                    to="/student-dashboard"
                    className={`relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                      isActiveRoute('/student-dashboard') 
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-500/25' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Dashboard</span>
                    </div>
                    {isActiveRoute('/student-dashboard') && (
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl blur opacity-30"></div>
                    )}
                  </Link>
                )}
                
                {user?.role === 'faculty' && (
                  <Link
                    to="/faculty-dashboard"
                    className={`relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                      isActiveRoute('/faculty-dashboard') 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Dashboard</span>
                    </div>
                    {isActiveRoute('/faculty-dashboard') && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-30"></div>
                    )}
                  </Link>
                )}

                {user?.role === 'admin' && (
                  <Link
                    to="/admin-dashboard"
                    className={`relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                      isActiveRoute('/admin-dashboard') 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Admin Dashboard</span>
                    </div>
                    {isActiveRoute('/admin-dashboard') && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30"></div>
                    )}
                  </Link>
                )}
              </nav>
            )}

            {/* Ultra Cool User Menu */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {isAuthenticated ? (
                <>
                  <ThemeToggle />
                  <div className="hidden sm:flex items-center space-x-4 text-sm">
                    <div className="relative">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-30"></div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-semibold">{user?.name}</span>
                      <Badge className="text-xs bg-gradient-to-r from-green-500 to-teal-500 text-white border-0 shadow-lg">
                        {user?.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProfileOpen(true)}
                      className="px-4 py-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 rounded-xl"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      <span>Profile</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="px-4 py-2 bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-300 rounded-xl"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <ThemeToggle />
                  <Button asChild variant="outline" size="sm" className="px-4 py-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 rounded-xl">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild size="sm" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 rounded-xl shadow-lg">
                    <Link to="/register">Register</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Mobile Navigation Menu */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-nav" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-veltech-gradient rounded-xl shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{user?.name}</p>
                    <Badge variant="outline" className="text-xs bg-veltech-gradient text-white border-0 shadow-sm">
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-muted-foreground hover:bg-white/50 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <nav className="p-6 space-y-3">
              <Link
                to="/"
                className={`nav-link hover-lift ${
                  isActiveRoute('/') 
                    ? 'active' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              
              {user?.role === 'student' && (
                <Link
                  to="/student-dashboard"
                  className={`nav-link hover-lift ${
                    isActiveRoute('/student-dashboard') 
                      ? 'active' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FileText className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              )}
              
              {user?.role === 'faculty' && (
                <Link
                  to="/faculty-dashboard"
                  className={`nav-link hover-lift ${
                    isActiveRoute('/faculty-dashboard') 
                      ? 'active' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FileText className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              )}

              {user?.role === 'admin' && (
                <Link
                  to="/admin-dashboard"
                  className={`nav-link hover-lift ${
                    isActiveRoute('/admin-dashboard') 
                      ? 'active' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FileText className="h-5 w-5" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </nav>
            
            <div className="p-4 border-t border-gray-200 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsProfileOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-300"
              >
                <Settings className="h-4 w-4" />
                <span>Profile</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Main Content */}
      <main className="flex-1 px-4 pb-8 animate-fade-in">
        <div className="container-responsive">
          {children}
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="glass-card mx-4 mt-8 mb-4 animate-fade-in">
        <div className="container-responsive py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="p-3 rounded-2xl shadow-lg bg-veltech-gradient">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gradient">
                DocuFlow
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              © 2024 Digital Document Approval System. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground px-4 leading-relaxed">
              Streamlining academic document approval processes with digital signatures and tracking.
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-medium">
              Powered suraj
            </p>
          </div>
        </div>
      </footer>

      {/* Profile Editor Modal */}
      <ProfileEditor 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
};

export default Layout;