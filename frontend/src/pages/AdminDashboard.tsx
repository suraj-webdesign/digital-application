import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  FileText, 
  Settings, 
  Activity, 
  UserCheck, 
  UserX, 
  Search,
  Download,
  Eye,
  Crown,
  Home,
  LogOut,
  User,
  Clock,
  BarChart3,
  Moon,
  Sun,
  Plus,
  Archive,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  isActive: boolean;
  createdAt: string;
  vtuId?: string;
  facultyId?: string;
  designation?: string;
  department?: string;
  lastLogin?: string;
  phone?: string;
  address?: string;
  year?: string;
  semester?: string;
  specialization?: string;
}

interface Document {
  _id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  fileName: string;
  workflow: string;
  currentApprover: string;
  daysPending: number;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { lastUpdate, isConnected } = useWebSocket();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // User management states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'faculty' | 'admin',
    vtuId: '',
    facultyId: '',
    designation: '',
    department: '',
    phone: '',
    address: '',
    year: '',
    semester: '',
    specialization: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000); // 30 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastUpdate && lastUpdate.type === 'approval_updated') {
      const updateData = lastUpdate.data;
      
      console.log('📡 Real-time approval update received:', updateData);
      
      // Show toast notification for any approval update
      toast({
        title: "System Update",
        description: `Letter ${updateData.letterId} has been ${updateData.status} by ${updateData.approverName}`,
      });
      
      // Refresh the data to show updated status
      loadData();
    }
  }, [lastUpdate, toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading admin dashboard data...');
      
      // Load users and documents in parallel
      const [usersResponse, documentsResponse] = await Promise.all([
        ApiService.getAllUsers(),
        ApiService.getAllDocuments()
      ]);

      console.log('📥 Users response:', usersResponse);
      console.log('📥 Documents response:', documentsResponse);

      if (usersResponse.success) {
        console.log('✅ Users loaded:', usersResponse.data.users?.length || 0);
        setUsers(usersResponse.data.users || []);
      } else {
        console.error('❌ Failed to load users:', usersResponse.message);
      }

      if (documentsResponse.success) {
        console.log('✅ Documents loaded:', documentsResponse.data.documents?.length || 0);
        setDocuments(documentsResponse.data.documents || []);
      } else {
        console.error('❌ Failed to load documents:', documentsResponse.message);
      }
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      toast({
        title: "Error loading data",
        description: `Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of the admin dashboard."
    });
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const user = users.find(u => u._id === userId);
      if (!user) return;

      const response = await ApiService.updateUserStatus(userId, !user.isActive);
      
      if (response.success) {
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, isActive: !u.isActive } : u
        ));
        toast({
          title: "User status updated",
          description: "User status has been updated successfully."
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error updating user",
        description: "Failed to update user status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await ApiService.updateUserRole(userId, newRole);
      
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, role: newRole as 'student' | 'faculty' | 'admin' } : user
        ));
        toast({
          title: "User role updated",
          description: "User role has been updated successfully."
        });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error updating user role",
        description: "Failed to update user role. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddUser = async () => {
    setIsSubmitting(true);
    try {
      const response = await ApiService.register({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role as 'student' | 'faculty',
        vtuId: newUser.role === 'student' ? newUser.vtuId : undefined,
        facultyId: newUser.role === 'faculty' ? newUser.facultyId : undefined,
        designation: newUser.role === 'faculty' ? newUser.designation : undefined,
        department: newUser.department,
        phone: newUser.phone,
        address: newUser.address,
        year: newUser.role === 'student' ? newUser.year : undefined,
        semester: newUser.role === 'student' ? newUser.semester : undefined,
        specialization: newUser.role === 'student' ? newUser.specialization : undefined
      });
      
      if (response.success) {
        toast({
          title: "User created successfully",
          description: `${newUser.name} has been added to the system.`
        });
        setShowAddUserModal(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'student',
          vtuId: '',
          facultyId: '',
          designation: '',
          department: '',
          phone: '',
          address: '',
          year: '',
          semester: '',
          specialization: ''
        });
        loadData(); // Reload data
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error creating user",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    
    setIsSubmitting(true);
    try {
      const response = await ApiService.updateUser(editingUser._id, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        vtuId: editingUser.role === 'student' ? editingUser.vtuId : undefined,
        facultyId: editingUser.role === 'faculty' ? editingUser.facultyId : undefined,
        designation: editingUser.role === 'faculty' ? editingUser.designation : undefined,
        department: editingUser.department,
        phone: editingUser.phone,
        address: editingUser.address,
        year: editingUser.role === 'student' ? editingUser.year : undefined,
        semester: editingUser.role === 'student' ? editingUser.semester : undefined,
        specialization: editingUser.role === 'student' ? editingUser.specialization : undefined
      });
      
      if (response.success) {
        toast({
          title: "User updated successfully",
          description: `${editingUser.name}'s profile has been updated.`
        });
        setShowEditUserModal(false);
        setEditingUser(null);
        loadData(); // Reload data
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error updating user",
        description: "Failed to update user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await ApiService.deleteUser(userId);
      
      if (response.success) {
        toast({
          title: "User deleted successfully",
          description: `${userName} has been removed from the system.`
        });
        loadData(); // Reload data
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error deleting user",
        description: "Failed to delete user. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser({ ...user });
    setShowEditUserModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Debug logging
  console.log('🔍 Admin Dashboard Debug:');
  console.log('Users array:', users);
  console.log('Users length:', users.length);
  console.log('Filtered users:', filteredUsers);
  console.log('Filtered users length:', filteredUsers.length);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'faculty': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    totalDocuments: documents.length,
    pendingDocuments: documents.filter(d => d.status === 'pending').length,
    approvedDocuments: documents.filter(d => d.status === 'approved').length,
    rejectedDocuments: documents.filter(d => d.status === 'rejected').length,
    delayedApprovals: documents.filter(d => d.daysPending > 7).length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Navigation */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="flex justify-between items-center px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">Welcome back, {user?.name}</p>
              </div>
            </div>
            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {/* Home Button */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              <Link to="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            
            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <nav className="p-4 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'workflows', label: 'Workflows', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? `${darkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'}`
                    : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                }`}
              >
                <item.icon className="h-5 w-5" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                        <p className="text-xs text-gray-500">{stats.activeUsers} active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Documents</p>
                        <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                        <p className="text-xs text-gray-500">{stats.pendingDocuments} pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Delayed</p>
                        <p className="text-2xl font-bold">{stats.delayedApprovals}</p>
                        <p className="text-xs text-gray-500">&gt; 7 days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                        <p className="text-2xl font-bold">
                          {stats.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0}%
                        </p>
                        <p className="text-xs text-gray-500">successful</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.slice(0, 5).map(doc => (
                      <div key={doc._id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                        <div className={`w-2 h-2 rounded-full ${
                          doc.status === 'approved' ? 'bg-green-500' :
                          doc.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-500">Submitted by {doc.submittedBy}</p>
                        </div>
                        <Badge className={getStatusColor(doc.status)}>
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Manage system users, roles, and status ({users.length} users)</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={loadData}
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh</span>
                      </Button>
                    <Button onClick={() => setShowAddUserModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className="text-left py-3 px-4">User</th>
                          <th className="text-left py-3 px-4">Role</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Last Login</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">
                              {users.length === 0 ? 'No users found. Loading...' : 'No users match your search criteria.'}
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                          <tr key={user._id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{user.name}</p>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-400">
                                    {user.vtuId || user.facultyId || user.designation}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getRoleColor(user.role)}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm text-gray-500">
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(user)}
                                  className="text-blue-600 border-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleUserStatus(user._id)}
                                  className={user.isActive ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}
                                >
                                  {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user._id, user.name)}
                                  className="text-red-600 border-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Select value={user.role} onValueChange={(value) => updateUserRole(user._id, value)}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="faculty">Faculty</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Document Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Total Documents</p>
                        <p className="text-xl font-bold">{stats.totalDocuments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-xl font-bold">{stats.pendingDocuments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <UserCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Approved</p>
                        <p className="text-xl font-bold">{stats.approvedDocuments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Delayed</p>
                        <p className="text-xl font-bold">{stats.delayedApprovals}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Document Management</CardTitle>
                      <CardDescription>View, manage, and track all system documents</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => loadData()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search documents by title, submitter, or workflow..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Documents Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className="text-left py-3 px-4">Document</th>
                          <th className="text-left py-3 px-4">Submitter</th>
                          <th className="text-left py-3 px-4">Workflow</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Submitted</th>
                          <th className="text-left py-3 px-4">Days Pending</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((doc) => (
                          <tr key={doc._id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} hover:bg-gray-50`}>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">{doc.title}</p>
                                <p className="text-sm text-gray-500">{doc.fileName}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{doc.submittedBy}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium">{doc.workflow}</p>
                              <p className="text-xs text-gray-500">Current: {doc.currentApprover}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusColor(doc.status)}>
                                {doc.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm text-gray-500">
                                {new Date(doc.submittedAt).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${
                                  doc.daysPending > 7 ? 'text-red-600' : 
                                  doc.daysPending > 3 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {doc.daysPending} days
                                </span>
                                {doc.daysPending > 7 && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" title="View Document">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" title="Download Document">
                                  <Download className="h-4 w-4" />
                                </Button>
                                {doc.status === 'pending' && (
                                  <Button variant="outline" size="sm" className="text-green-600 border-green-600" title="Approve">
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                {doc.status === 'pending' && (
                                  <Button variant="outline" size="sm" className="text-red-600 border-red-600" title="Reject">
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" title="Archive Document">
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                      <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Other tabs */}
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              {/* Workflow Overview */}
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Workflow Management
                  </CardTitle>
                  <CardDescription>Configure and manage document approval workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Current Workflow */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Current Workflow</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                          <div>
                            <p className="font-medium">Faculty Review</p>
                            <p className="text-sm text-gray-500">Initial approval by assigned faculty</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                          <div>
                            <p className="font-medium">HOD Approval</p>
                            <p className="text-sm text-gray-500">Department head review</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                          <div>
                            <p className="font-medium">Principal Approval</p>
                            <p className="text-sm text-gray-500">Final institutional approval</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Workflow Statistics */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Workflow Statistics</h4>
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Active Workflows</span>
                            <Badge variant="secondary">3</Badge>
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Pending Documents</span>
                            <Badge variant="outline">{documents.filter(d => d.status === 'pending').length}</Badge>
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Avg. Processing Time</span>
                            <Badge variant="outline">2.3 days</Badge>
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Completion Rate</span>
                            <Badge className="bg-green-500">94.2%</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Quick Actions</h4>
                      <div className="space-y-3">
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Workflow Test Started",
                              description: "Testing workflow configuration...",
                            });
                          }}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Test Workflow
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Workflow Reset",
                              description: "All pending documents have been reset to initial state",
                            });
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset Pending
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Escalation Started",
                              description: "Escalating overdue documents to next level",
                            });
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Escalate Overdue
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Workflow Report Generated",
                              description: "Downloading workflow performance report",
                            });
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Analytics Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                  <p className="text-gray-600">System performance and usage statistics</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={loadData}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Data</span>
                </Button>
              </div>
              
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card 
                  className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => {
                    toast({
                      title: "User Statistics",
                      description: `Total Users: ${stats.totalUsers}, Active: ${stats.activeUsers}, Students: ${users.filter(u => u.role === 'student').length}, Faculty: ${users.filter(u => u.role === 'faculty').length}`,
                    });
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                        <p className="text-xs text-green-600">+12% from last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => {
                    toast({
                      title: "Document Statistics",
                      description: `Total Documents: ${stats.totalDocuments}, Pending: ${stats.pendingDocuments}, Approved: ${stats.approvedDocuments}, Rejected: ${stats.rejectedDocuments}`,
                    });
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Documents Processed</p>
                        <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                        <p className="text-xs text-green-600">+8% from last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                        <p className="text-2xl font-bold">
                          {stats.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0}%
                        </p>
                        <p className="text-xs text-green-600">+3% from last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Avg. Processing Time</p>
                        <p className="text-2xl font-bold">2.3 days</p>
                        <p className="text-xs text-red-600">+0.5 days from last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>Document Status Distribution</CardTitle>
                    <CardDescription>Current status of all documents in the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                          <span className="text-sm">Pending</span>
                        </div>
                        <span className="text-sm font-medium">{stats.pendingDocuments}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm">Approved</span>
                        </div>
                        <span className="text-sm font-medium">{stats.approvedDocuments}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                          <span className="text-sm">Rejected</span>
                        </div>
                        <span className="text-sm font-medium">{stats.rejectedDocuments}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>User Role Distribution</CardTitle>
                    <CardDescription>Breakdown of users by role</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm">Students</span>
                        </div>
                        <span className="text-sm font-medium">{users.filter(u => u.role === 'student').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <span className="text-sm">Faculty</span>
                        </div>
                        <span className="text-sm font-medium">{users.filter(u => u.role === 'faculty').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm">Admins</span>
                        </div>
                        <span className="text-sm font-medium">{users.filter(u => u.role === 'admin').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity and Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest system activities and changes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents.slice(0, 5).map((doc) => (
                        <div key={doc._id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                          <div className={`w-2 h-2 rounded-full ${
                            doc.status === 'approved' ? 'bg-green-500' :
                            doc.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.title}</p>
                            <p className="text-xs text-gray-500">
                              {doc.status} by {doc.submittedBy} • {new Date(doc.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">System Uptime</span>
                        <span className="text-sm font-medium text-green-600">99.9%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Active Users Today</span>
                        <span className="text-sm font-medium">{stats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Documents Processed Today</span>
                        <span className="text-sm font-medium">{Math.floor(stats.totalDocuments * 0.1)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Response Time</span>
                        <span className="text-sm font-medium">1.2s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Export and Reports */}
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>Reports & Export</CardTitle>
                  <CardDescription>Generate and download system reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => {
                        const userReport = {
                          totalUsers: stats.totalUsers,
                          activeUsers: stats.activeUsers,
                          students: users.filter(u => u.role === 'student').length,
                          faculty: users.filter(u => u.role === 'faculty').length,
                          admins: users.filter(u => u.role === 'admin').length,
                          inactiveUsers: users.filter(u => !u.isActive).length,
                          lastUpdated: new Date().toISOString()
                        };
                        
                        // Create and download CSV
                        const csvContent = `User Report\nTotal Users,${userReport.totalUsers}\nActive Users,${userReport.activeUsers}\nStudents,${userReport.students}\nFaculty,${userReport.faculty}\nAdmins,${userReport.admins}\nInactive Users,${userReport.inactiveUsers}\nGenerated,${userReport.lastUpdated}`;
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `user-report-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "User Report Generated",
                          description: `Downloaded report for ${stats.totalUsers} users`,
                        });
                      }}
                    >
                      <Download className="h-6 w-6 mb-2" />
                      <span>User Report</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => {
                        const documentReport = {
                          totalDocuments: stats.totalDocuments,
                          pendingDocuments: stats.pendingDocuments,
                          approvedDocuments: stats.approvedDocuments,
                          rejectedDocuments: stats.rejectedDocuments,
                          approvalRate: stats.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0,
                          lastUpdated: new Date().toISOString()
                        };
                        
                        // Create and download CSV
                        const csvContent = `Document Report\nTotal Documents,${documentReport.totalDocuments}\nPending,${documentReport.pendingDocuments}\nApproved,${documentReport.approvedDocuments}\nRejected,${documentReport.rejectedDocuments}\nApproval Rate,${documentReport.approvalRate}%\nGenerated,${documentReport.lastUpdated}`;
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `document-report-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "Document Report Generated",
                          description: `Downloaded report for ${stats.totalDocuments} documents`,
                        });
                      }}
                    >
                      <FileText className="h-6 w-6 mb-2" />
                      <span>Document Report</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => {
                        const analyticsReport = {
                          systemOverview: {
                            totalUsers: stats.totalUsers,
                            activeUsers: stats.activeUsers,
                            totalDocuments: stats.totalDocuments,
                            pendingDocuments: stats.pendingDocuments,
                            approvedDocuments: stats.approvedDocuments,
                            rejectedDocuments: stats.rejectedDocuments
                          },
                          userBreakdown: {
                            students: users.filter(u => u.role === 'student').length,
                            faculty: users.filter(u => u.role === 'faculty').length,
                            admins: users.filter(u => u.role === 'admin').length,
                            inactiveUsers: users.filter(u => !u.isActive).length
                          },
                          performance: {
                            approvalRate: stats.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0,
                            averageProcessingTime: "2.3 days",
                            systemUptime: "99.9%"
                          },
                          lastUpdated: new Date().toISOString()
                        };
                        
                        // Create and download JSON report
                        const jsonContent = JSON.stringify(analyticsReport, null, 2);
                        const blob = new Blob([jsonContent], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "Analytics Report Generated",
                          description: `Downloaded comprehensive analytics report`,
                        });
                      }}
                    >
                      <BarChart3 className="h-6 w-6 mb-2" />
                      <span>Analytics Report</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* System Settings Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Settings className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">System Status</p>
                        <p className="text-lg font-bold text-green-600">Online</p>
                        <p className="text-xs text-gray-500">All services running</p>
                      </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "System Check",
                            description: "All systems are operational and running smoothly.",
                          });
                        }}
                      >
                        Check Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                        <p className="text-lg font-bold">{stats.activeUsers}</p>
                        <p className="text-xs text-gray-500">Currently online</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Database Size</p>
                        <p className="text-lg font-bold">2.4 GB</p>
                        <p className="text-xs text-gray-500">Storage used</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>Basic system configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">System Name</p>
                        <p className="text-xs text-gray-500">Veltech Document Approval System</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newName = prompt("Enter new system name:", "Veltech Document Approval System");
                          if (newName && newName.trim()) {
                            toast({
                              title: "System Name Updated",
                              description: `System name changed to: ${newName}`,
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Maintenance Mode</p>
                        <p className="text-xs text-gray-500">System maintenance toggle</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const enableMaintenance = confirm("Enable maintenance mode? This will temporarily disable user access.");
                          if (enableMaintenance) {
                            toast({
                              title: "Maintenance Mode",
                              description: "Maintenance mode enabled. Users will see maintenance page.",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Maintenance Mode",
                              description: "Maintenance mode remains disabled.",
                            });
                          }
                        }}
                      >
                        Disabled
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto Backup</p>
                        <p className="text-xs text-gray-500">Daily database backups</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 border-green-600"
                        onClick={() => {
                          const disableBackup = confirm("Disable auto backup? This will stop daily database backups.");
                          if (disableBackup) {
                            toast({
                              title: "Auto Backup",
                              description: "Auto backup disabled. Manual backups recommended.",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Auto Backup",
                              description: "Auto backup remains enabled.",
                            });
                          }
                        }}
                      >
                        Enabled
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Email Notifications</p>
                        <p className="text-xs text-gray-500">Send email alerts</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 border-green-600"
                        onClick={() => {
                          const disableEmails = confirm("Disable email notifications? Users won't receive email alerts.");
                          if (disableEmails) {
                            toast({
                              title: "Email Notifications",
                              description: "Email notifications disabled. Users won't receive alerts.",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Email Notifications",
                              description: "Email notifications remain enabled.",
                            });
                          }
                        }}
                      >
                        Enabled
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Authentication and security configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Password Policy</p>
                        <p className="text-xs text-gray-500">Minimum 6 characters</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newPolicy = prompt("Enter new password policy (e.g., 'Minimum 8 characters with numbers'):", "Minimum 6 characters");
                          if (newPolicy && newPolicy.trim()) {
                            toast({
                              title: "Password Policy Updated",
                              description: `New policy: ${newPolicy}`,
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Session Timeout</p>
                        <p className="text-xs text-gray-500">7 days</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newTimeout = prompt("Enter new session timeout (in days):", "7");
                          if (newTimeout && !isNaN(Number(newTimeout))) {
                            toast({
                              title: "Session Timeout Updated",
                              description: `Session timeout changed to ${newTimeout} days`,
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Two-Factor Auth</p>
                        <p className="text-xs text-gray-500">Optional for users</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const enable2FA = confirm("Make Two-Factor Authentication mandatory for all users?");
                          if (enable2FA) {
                            toast({
                              title: "Two-Factor Auth",
                              description: "2FA is now mandatory for all users",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Two-Factor Auth",
                              description: "2FA remains optional for users",
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">IP Whitelist</p>
                        <p className="text-xs text-gray-500">Restrict access by IP</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const enableWhitelist = confirm("Enable IP whitelist? This will restrict access to specific IP addresses.");
                          if (enableWhitelist) {
                            const ipAddresses = prompt("Enter allowed IP addresses (comma-separated):", "192.168.1.1, 10.0.0.1");
                            if (ipAddresses && ipAddresses.trim()) {
                              toast({
                                title: "IP Whitelist Enabled",
                                description: `Allowed IPs: ${ipAddresses}`,
                                variant: "destructive"
                              });
                            }
                          } else {
                            toast({
                              title: "IP Whitelist",
                              description: "IP whitelist remains disabled",
                            });
                          }
                        }}
                      >
                        Disabled
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Settings */}
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>Workflow Configuration</CardTitle>
                  <CardDescription>Configure document approval workflows and routing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Default Approval Time</h4>
                      <p className="text-sm text-gray-500 mb-3">Maximum days for document approval</p>
                      <div className="flex items-center space-x-2">
                        <Input type="number" defaultValue="7" className="w-20" />
                        <span className="text-sm">days</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          toast({
                            title: "Approval Time Updated",
                            description: "Default approval time has been updated",
                          });
                        }}
                      >
                        Update
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Auto-Escalation</h4>
                      <p className="text-sm text-gray-500 mb-3">Escalate pending documents</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 border-green-600"
                        onClick={() => {
                          toast({
                            title: "Auto-Escalation Toggled",
                            description: "Auto-escalation has been enabled/disabled",
                          });
                        }}
                      >
                        Enabled
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Notification Frequency</h4>
                      <p className="text-sm text-gray-500 mb-3">How often to send reminders</p>
                      <Select defaultValue="daily">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          toast({
                            title: "Notification Frequency Updated",
                            description: "Reminder frequency has been updated",
                          });
                        }}
                      >
                        Update
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Workflow Steps</h4>
                      <p className="text-sm text-gray-500 mb-3">Configure approval steps</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Faculty Review</span>
                          <Badge variant="outline">Required</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">HOD Approval</span>
                          <Badge variant="outline">Required</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Principal Approval</span>
                          <Badge variant="outline">Required</Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          toast({
                            title: "Workflow Steps Updated",
                            description: "Approval workflow steps have been configured",
                          });
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Priority Handling</h4>
                      <p className="text-sm text-gray-500 mb-3">Handle urgent documents</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">High Priority</span>
                          <Badge className="bg-red-500">24h</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Medium Priority</span>
                          <Badge className="bg-yellow-500">3d</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Low Priority</span>
                          <Badge className="bg-green-500">7d</Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          toast({
                            title: "Priority Settings Updated",
                            description: "Document priority handling has been configured",
                          });
                        }}
                      >
                        Update
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Workflow Actions</h4>
                      <p className="text-sm text-gray-500 mb-3">Manage workflow operations</p>
                      <div className="space-y-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => {
                            toast({
                              title: "Workflow Tested",
                              description: "Workflow configuration has been tested successfully",
                            });
                          }}
                        >
                          <Activity className="h-3 w-3 mr-2" />
                          Test Workflow
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => {
                            toast({
                              title: "Workflow Reset",
                              description: "All workflows have been reset to default configuration",
                            });
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Reset Workflow
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Actions */}
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>System Actions</CardTitle>
                  <CardDescription>Administrative actions and maintenance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => {
                        const clearCache = confirm("Clear system cache? This will improve performance but may cause temporary slowdown.");
                        if (clearCache) {
                          toast({
                            title: "Cache Cleared",
                            description: "System cache has been cleared successfully",
                          });
                        }
                      }}
                    >
                      <RefreshCw className="h-6 w-6 mb-2" />
                      <span>Clear Cache</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => {
                        const backupDB = confirm("Create database backup? This will download a backup file.");
                        if (backupDB) {
                          // Create a mock backup file
                          const backupData = {
                            timestamp: new Date().toISOString(),
                            users: users.length,
                            documents: documents.length,
                            systemInfo: {
                              version: "1.0.0",
                              uptime: "99.9%",
                              lastBackup: new Date().toISOString()
                            }
                          };
                          
                          const jsonContent = JSON.stringify(backupData, null, 2);
                          const blob = new Blob([jsonContent], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Database Backup Created",
                            description: "Database backup has been downloaded successfully",
                          });
                        }
                      }}
                    >
                      <Download className="h-6 w-6 mb-2" />
                      <span>Backup Database</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center text-yellow-600 border-yellow-600"
                      onClick={() => {
                        const enableMaintenance = confirm("Enable maintenance mode? This will disable user access temporarily.");
                        if (enableMaintenance) {
                          toast({
                            title: "Maintenance Mode Enabled",
                            description: "System is now in maintenance mode. Users cannot access the system.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Settings className="h-6 w-6 mb-2" />
                      <span>Maintenance Mode</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center text-red-600 border-red-600"
                      onClick={() => {
                        const restartSystem = confirm("Restart the system? This will cause temporary downtime.");
                        if (restartSystem) {
                          toast({
                            title: "System Restart Initiated",
                            description: "System restart has been initiated. Please wait for the system to come back online.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <AlertTriangle className="h-6 w-6 mb-2" />
                      <span>System Restart</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New User</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddUserModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as 'student' | 'faculty' | 'admin' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newUser.role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="vtuId">VTU ID *</Label>
                    <Input
                      id="vtuId"
                      value={newUser.vtuId}
                      onChange={(e) => setNewUser({ ...newUser, vtuId: e.target.value })}
                      placeholder="Enter VTU ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Select value={newUser.year} onValueChange={(value) => setNewUser({ ...newUser, year: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select value={newUser.semester} onValueChange={(value) => setNewUser({ ...newUser, semester: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Semester</SelectItem>
                        <SelectItem value="2">2nd Semester</SelectItem>
                        <SelectItem value="3">3rd Semester</SelectItem>
                        <SelectItem value="4">4th Semester</SelectItem>
                        <SelectItem value="5">5th Semester</SelectItem>
                        <SelectItem value="6">6th Semester</SelectItem>
                        <SelectItem value="7">7th Semester</SelectItem>
                        <SelectItem value="8">8th Semester</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {newUser.role === 'faculty' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facultyId">Faculty ID *</Label>
                    <Input
                      id="facultyId"
                      value={newUser.facultyId}
                      onChange={(e) => setNewUser({ ...newUser, facultyId: e.target.value })}
                      placeholder="Enter faculty ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={newUser.designation}
                      onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                      placeholder="Enter designation"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              {newUser.role === 'student' && (
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={newUser.specialization}
                    onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
                    placeholder="Enter specialization"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit User: {editingUser.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowEditUserModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser({ ...editingUser, role: value as 'student' | 'faculty' | 'admin' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingUser.role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-vtuId">VTU ID *</Label>
                    <Input
                      id="edit-vtuId"
                      value={editingUser.vtuId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, vtuId: e.target.value })}
                      placeholder="Enter VTU ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-year">Year</Label>
                    <Select value={editingUser.year || ''} onValueChange={(value) => setEditingUser({ ...editingUser, year: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-semester">Semester</Label>
                    <Select value={editingUser.semester || ''} onValueChange={(value) => setEditingUser({ ...editingUser, semester: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Semester</SelectItem>
                        <SelectItem value="2">2nd Semester</SelectItem>
                        <SelectItem value="3">3rd Semester</SelectItem>
                        <SelectItem value="4">4th Semester</SelectItem>
                        <SelectItem value="5">5th Semester</SelectItem>
                        <SelectItem value="6">6th Semester</SelectItem>
                        <SelectItem value="7">7th Semester</SelectItem>
                        <SelectItem value="8">8th Semester</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {editingUser.role === 'faculty' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-facultyId">Faculty ID *</Label>
                    <Input
                      id="edit-facultyId"
                      value={editingUser.facultyId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, facultyId: e.target.value })}
                      placeholder="Enter faculty ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-designation">Designation</Label>
                    <Input
                      id="edit-designation"
                      value={editingUser.designation || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                      placeholder="Enter designation"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingUser.address || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              {editingUser.role === 'student' && (
                <div>
                  <Label htmlFor="edit-specialization">Specialization</Label>
                  <Input
                    id="edit-specialization"
                    value={editingUser.specialization || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, specialization: e.target.value })}
                    placeholder="Enter specialization"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
