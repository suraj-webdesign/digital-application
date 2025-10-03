import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  _id: string;
  vtuId?: string;
  facultyId?: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  designation?: string;
  signature?: string; // Base64 encoded signature image
  signatureUploadedAt?: string; // When signature was uploaded
  phone?: string;
  address?: string;
  department?: string;
  studentId?: string;
  year?: string;
  semester?: string;
  specialization?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  updateSignature: (signature: string) => void;
  removeSignature: () => void;
  updateUser: (userData: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on app start
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    // Clear all auth-related data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Clear any other auth-related data
    localStorage.removeItem('authState');
    sessionStorage.clear();
  };

  const updateSignature = (signature: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        signature,
        signatureUploadedAt: new Date().toISOString()
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const removeSignature = () => {
    if (user) {
      const updatedUser = {
        ...user,
        signature: undefined,
        signatureUploadedAt: undefined
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const isAuthenticated = !!user && !!localStorage.getItem('token');

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated, 
      updateSignature, 
      removeSignature,
      updateUser,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};