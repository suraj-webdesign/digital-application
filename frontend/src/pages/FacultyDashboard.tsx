import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import SignatureManager from '@/components/SignatureManager';
import SignedDocumentGenerator from '@/components/SignedDocumentGenerator';
import DocumentViewer from '@/components/DocumentViewer';
import { signRealDocument, downloadSignedDocument, DocumentSignatureData } from '@/utils/documentSigner';
import { FileText, CheckCircle, XCircle, Eye, Clock, Users, PenTool, Download, Loader2, RefreshCw } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  studentName: string;
  studentId: string;
  fileName: string;
  summary: string;
  approvalPath: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  downloadHistory?: {
    id: string;
    downloadedAt: string;
    downloadedBy: string;
    userRole: string;
    ipAddress?: string;
  }[];
}

interface ApprovalHistoryRecord {
  _id: string;
  document_id: string;
  approver_id: string;
  status: 'approved' | 'rejected' | 'signed';
  signed_pdf_url?: string;
  comment?: string;
  rejection_reason?: string;
  approver_name: string;
  approver_role: string;
  approver_designation?: string;
  document_title: string;
  student_name: string;
  student_id: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  workflow_step: string;
  is_final_approval: boolean;
  approved_at: string;
  signed_at?: string;
  createdAt: string;
  updatedAt: string;
}

const FacultyDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { lastUpdate, isConnected } = useWebSocket();
  
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRecord[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<ApprovalRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  // Load pending documents on component mount
  useEffect(() => {
    loadPendingDocuments();
    loadStats();
    loadApprovalHistory();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadPendingDocuments();
      loadStats();
      loadApprovalHistory();
    }, 30000); // 30 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastUpdate) {
      const updateData = lastUpdate.data;
      
      console.log('📡 Real-time update received:', lastUpdate.type, updateData);
      
      // Common variable for time checking
      const currentTime = Date.now();
      
      switch (lastUpdate.type) {
        case 'approval_updated':
          // Show toast notification for approval updates
          toast({
            title: "Approval Update",
            description: `Letter ${updateData.letterId} has been ${updateData.status} by ${updateData.approverName}`,
          });
          
          // Only refresh data if it's not our own action and not too frequent to prevent infinite loop
          if (updateData.facultyId !== user?._id && (currentTime - lastRefreshTime) > 2000) {
            setLastRefreshTime(currentTime);
            loadPendingDocuments();
            loadStats();
            loadApprovalHistory();
          }
          break;
          
        case 'document_updated':
          // Show toast notification for document updates
          toast({
            title: "Document Update",
            description: `Document ${updateData.documentId} status: ${updateData.status}`,
          });
          
          // Only refresh data if it's not our own action and not too frequent to prevent infinite loop
          if (updateData.userId !== user?._id && (currentTime - lastRefreshTime) > 2000) {
            setLastRefreshTime(currentTime);
            loadPendingDocuments();
            loadStats();
          }
          break;
          
        case 'user_activity':
          // Log user activity (for admin monitoring)
          console.log('👤 User activity:', updateData);
          break;
          
        case 'notification':
          // Show custom notifications
          toast({
            title: updateData.title || "Notification",
            description: updateData.message || "You have a new notification",
          });
          break;
          
        case 'system_message':
          // Show system messages
          toast({
            title: "System Message",
            description: updateData.message,
          });
          break;
          
        default:
          console.log('📡 Unknown update type:', lastUpdate.type);
      }
    }
  }, [lastUpdate, toast]);

  const loadPendingDocuments = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading assigned letters for faculty...');
      console.log('Current user:', user);
      
      const response = await ApiService.getAssignedLetters();
      console.log('📥 Assigned letters response:', response);
      
      if (response && response.success) {
        console.log('📄 Raw letters data:', response.data.letters);
        console.log('🕐 Successfully loaded at:', new Date().toLocaleTimeString());
        
        // Transform API data to match our interface
        const transformedRequests = response.data.letters.map((letter: any) => ({
          id: letter._id,
          studentName: letter.submittedBy?.name || 'Unknown Student',
          studentId: letter.submittedBy?.vtuId || letter.submittedBy?.facultyId || 'Unknown ID',
          fileName: letter.title || 'Letter',
          summary: `Letter: ${letter.title}`,
          content: letter.content || '', // Include letter content
          approvalPath: getWorkflowPath(letter),
          status: letter.status,
          submittedAt: letter.submittedAt,
          approvedAt: letter.approvedAt,
          approvedBy: letter.approvedBy?.name,
          rejectionReason: letter.rejectionReason,
          downloadHistory: letter.downloadHistory || [],
          workflowStep: letter.workflowStep,
          assignedMentor: letter.assignedMentor ? `${letter.assignedMentor.name} (${letter.assignedMentor.designation})` : null,
          assignedHOD: letter.assignedHOD ? `${letter.assignedHOD.name} (${letter.assignedHOD.designation})` : null,
          assignedDean: letter.assignedDean ? `${letter.assignedDean.name} (${letter.assignedDean.designation})` : null,
          currentApprover: letter.currentApprover ? `${letter.currentApprover.name} (${letter.currentApprover.designation})` : null,
          // Add debug information
          debugInfo: {
            letterId: letter._id,
            workflowStep: letter.workflowStep,
            assignedMentorId: letter.assignedMentor?._id || letter.assignedMentor,
            assignedHODId: letter.assignedHOD?._id || letter.assignedHOD,
            assignedDeanId: letter.assignedDean?._id || letter.assignedDean,
            currentApproverId: letter.currentApprover?._id || letter.currentApprover
          }
        }));
        
        console.log('🔄 Transformed requests:', transformedRequests);
        console.log('🔍 Sample transformed request:', transformedRequests[0]);
        console.log('✅ Successfully loaded', transformedRequests.length, 'documents');
        setRequests(transformedRequests);
        setLastUpdated(new Date());
      } else {
        console.log('❌ Failed to load documents:', response?.message || 'Unknown error');
        console.log('❌ Response object:', response);
        setRequests([]);
      }
    } catch (error) {
      console.error('❌ Error loading assigned documents:', error);
      toast({
        title: "Error",
        description: "Failed to load assigned documents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadApprovalHistory = async () => {
    try {
      console.log('🔍 Loading approval history for faculty...');
      
      const response = await ApiService.getFacultyApprovalHistory();
      console.log('📥 Approval history response:', response);
      
      if (response && response.success) {
        console.log('📄 Raw approval history data:', response.data.approvals);
        setApprovalHistory(response.data.approvals);
        console.log('✅ Successfully loaded', response.data.approvals.length, 'approval records');
      } else {
        console.log('❌ Failed to load approval history:', response?.message || 'Unknown error');
        setApprovalHistory([]);
      }
    } catch (error) {
      console.error('❌ Error loading approval history:', error);
      toast({
        title: "Error",
        description: "Failed to load approval history",
        variant: "destructive"
      });
    }
  };

  const getWorkflowPath = (doc: any) => {
    const path = [];
    if (doc.assignedMentor) path.push('Mentor');
    if (doc.assignedHOD) path.push('HOD');
    if (doc.assignedDean) path.push('Dean');
    return path.join(' → ');
  };

  // Removed unused handleViewDetails function

  const handleCloseDetails = () => {
    setShowDetailsDialog(false);
    setSelectedDocument(null);
  };

  const handleOpenRejectDialog = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleCloseRejectDialog = () => {
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const handleOpenSignDialog = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowSignDialog(true);
  };

  const handleCloseSignDialog = () => {
    setShowSignDialog(false);
    setSelectedRequest(null);
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading approval stats...');
      const response = await ApiService.getApprovalStats();
      console.log('📊 Stats response:', response);
      
      if (response && response.success) {
        const newStats = {
          pending: response.data.counts.pending,
          approved: response.data.counts.approved,
          rejected: response.data.counts.rejected,
          total: response.data.counts.pending + response.data.counts.approved + response.data.counts.rejected
        };
        console.log('📊 Updated stats:', newStats);
        setStats(newStats);
      } else {
        console.log('❌ Failed to load stats:', response?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      console.log('📤 Approving letter:', requestId);
      console.log('📤 Current user ID:', user?._id);
      console.log('📤 Current user role:', user?.role);
      
      // Find the request to get debug info
      const request = requests.find(req => req.id === requestId);
      if (request && (request as any).debugInfo) {
        console.log('📤 Debug info for letter:', (request as any).debugInfo);
      }
      
      const response = await ApiService.approveLetter(requestId);
      console.log('📥 Approve response:', response);
      
      if (response.success) {
        const message = response.data.nextStep === 'completed' 
          ? 'Letter fully approved and ready for signing!'
          : `Letter approved, moved to ${response.data.nextStep} stage`;
        
        toast({
          title: "Request approved",
          description: message,
        });
        // Reload data
        loadPendingDocuments();
        loadStats();
      }
    } catch (error) {
      console.error('❌ Error approving letter:', error);
      console.error('❌ Error details:', {
        requestId,
        userId: user?._id,
        userRole: user?.role,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve letter",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "You must provide a detailed reason for rejection. This helps students understand what needs to be improved.",
        variant: "destructive"
      });
      return;
    }

    if (reason.trim().length < 10) {
      toast({
        title: "Insufficient Rejection Reason",
        description: "Please provide a more detailed reason (at least 10 characters) to help the student understand what needs to be improved.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await ApiService.rejectLetter(requestId, reason);
      if (response.success) {
        toast({
          title: "Request rejected",
          description: "The letter has been rejected with feedback",
        });
        // Reload data
        loadPendingDocuments();
        loadStats();
        setRejectionReason('');
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Error rejecting letter:', error);
      toast({
        title: "Error",
        description: "Failed to reject letter",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (documentId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      if (status === 'approved') {
        await handleApprove(documentId);
      } else if (status === 'rejected') {
        await handleReject(documentId, reason || '');
      }
    } catch (error) {
      console.error('❌ Error changing document status:', error);
      throw error;
    }
  };

  const handleDownload = () => {
    // In real app, this would generate and download the signed document
    toast({
      title: "Download initiated",
      description: "Signed document is being prepared for download",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const completedRequests = requests.filter(req => req.status !== 'pending');
  const approvedRequests = requests.filter(req => req.status === 'approved');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Ultra Modern Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Faculty Dashboard</h1>
            <p className="text-xl sm:text-2xl text-white mt-2">Welcome back, <span className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name}</span></p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => {
                loadPendingDocuments();
                loadStats();
              }}
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 rounded-xl"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-300">
                {isConnected ? 'Live Updates' : 'Offline'}
              </span>
              {lastUpdate && (
                <span className="text-xs text-blue-400">
                  Last: {new Date(lastUpdate.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ultra Cool Last Updated Indicator */}
        {lastUpdated && (
          <div className="flex items-center justify-between text-base text-gray-300 mb-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-refresh enabled (30s)</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 border-white/20 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300 hover:text-white rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300 hover:text-white rounded-lg">Approvals</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300 hover:text-white rounded-lg">Approval History</TabsTrigger>
            <TabsTrigger value="signatures" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300 hover:text-white rounded-lg">Signatures</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300 hover:text-white rounded-lg">Signed Documents</TabsTrigger>
          </TabsList>

          {/* Ultra Cool Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Ultra Modern Stats Overview */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="glass-card-ultra hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.pending}</p>
                      <p className="text-sm text-gray-300">Pending Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-ultra hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {stats.approved}
                      </p>
                      <p className="text-sm text-gray-300">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-ultra hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.total}</p>
                      <p className="text-sm text-gray-300">Total Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-ultra hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                      <PenTool className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${user?.signature ? 'text-green-400' : 'text-red-400'}`}>
                        {user?.signature ? '✓' : '✗'}
                      </p>
                      <p className="text-sm text-gray-300">
                        {user?.signature ? 'Signature Active' : 'No Signature'}
                      </p>
                      {user?.signature && user?.signatureUploadedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded: {new Date(user.signatureUploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ultra Cool Quick Actions */}
            <Card className="glass-card-ultra hover-lift">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-300">Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button 
                  onClick={() => (document.querySelector('[data-value="approvals"]') as any)?.click()}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Review Pending Requests
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => (document.querySelector('[data-value="signatures"]') as any)?.click()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 rounded-xl"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Manage Signature
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => (document.querySelector('[data-value="documents"]') as any)?.click()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 rounded-xl"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Documents
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ultra Cool Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            {/* Ultra Modern Pending Requests */}
            <Card className="glass-card-ultra hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-xl font-bold text-white">
                  <Clock className="h-6 w-6 text-orange-400" />
                  <span>Pending Approval Requests</span>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Documents waiting for your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mb-6">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    </div>
                    <p className="text-lg text-white">Loading pending requests...</p>
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full mb-6">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <p className="text-lg text-white">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="glass-card-ultra rounded-2xl p-6 hover-lift transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-bold text-white text-lg">{request.fileName}</h3>
                              <Badge variant="outline" className="bg-white/10 border-white/20 text-white">{request.studentId}</Badge>
                            </div>
                            <p className="text-base text-gray-300 mb-2">
                              Student: {request.studentName}
                            </p>
                            <p className="text-base text-gray-300">
                              Submitted on {new Date(request.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(request.status)} px-3 py-1 rounded-xl`}>
                            <span className="flex items-center space-x-2">
                              {getStatusIcon(request.status)}
                              <span className="capitalize">{request.status}</span>
                            </span>
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 text-base mb-6">
                          <div>
                            <span className="font-semibold text-white">Summary: </span>
                            <span className="text-gray-300">{request.summary}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-white">Approval Path: </span>
                            <span className="text-gray-300">{request.approvalPath}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 pt-4 border-t border-white/20">
                          {/* Show Approve button if document is pending and user is current approver */}
                          {request.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(request.id)}
                              className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Approve</span>
                            </Button>
                          )}
                          
                          {/* Show Sign button if document is approved and user is final approver */}
                          {request.status === 'approved' && user?.signature && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleOpenSignDialog(request)}
                              className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <PenTool className="h-4 w-4" />
                              <span>Sign Document</span>
                            </Button>
                          )}
                          
                          {/* Show status if document is signed */}
                          {request.status === 'approved' && (
                            <div className="flex items-center space-x-2 text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-base font-semibold">Document Signed</span>
                            </div>
                          )}
                          
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleOpenRejectDialog(request)}
                            className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center space-x-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 rounded-xl"
                            onClick={() => {
                              setSelectedDocument(request);
                              setShowDocumentViewer(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Document</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {completedRequests.length > 0 && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Recently processed requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {completedRequests.slice(0, 5).map((request) => (
                      <div key={request.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{request.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.studentName} ({request.studentId})
                          </p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(request.status)}
                            <span className="capitalize">{request.status}</span>
                          </span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Approval History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Your Approval History</span>
                </CardTitle>
                <CardDescription>
                  All documents you have approved, rejected, or signed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvalHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No approval history found</p>
                    <p className="text-sm">Your approval history will appear here once you start reviewing documents</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvalHistory.map((record) => (
                      <div key={record._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{record.document_title}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Student: <span className="font-medium">{record.student_name}</span>
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Date: {new Date(record.approved_at).toLocaleDateString()}</span>
                              <span>Time: {new Date(record.approved_at).toLocaleTimeString()}</span>
                              <span>Step: {record.workflow_step}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <Badge className={`${
                              record.status === 'approved' ? 'bg-green-100 text-green-800' :
                              record.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              record.status === 'signed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            } px-3 py-1 text-sm font-medium`}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        {record.comment && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Comment:</span> {record.comment}
                            </p>
                          </div>
                        )}
                        
                        {record.rejection_reason && (
                          <div className="mb-3">
                            <p className="text-sm text-red-600">
                              <span className="font-medium">Rejection Reason:</span> {record.rejection_reason}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>File: {record.file_name || 'N/A'}</span>
                            {record.file_size && (
                              <span>({Math.round(record.file_size / 1024)} KB)</span>
                            )}
                          </div>
                          
                          {record.signed_pdf_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center space-x-2"
                              onClick={async () => {
                                try {
                                  // Use the new signed letter download API
                                  const signedLetterBlob = await ApiService.downloadSignedLetter(record.document_id);
                                  
                                  const url = URL.createObjectURL(signedLetterBlob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `SIGNED_${record.document_title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  
                                  toast({
                                    title: "Signed Letter Downloaded!",
                                    description: "The signed letter has been downloaded successfully.",
                                  });
                                } catch (error) {
                                  console.error('Error downloading signed letter:', error);
                                  toast({
                                    title: "Download Failed",
                                    description: "Failed to download the signed letter. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                              <span>Download Signed Copy</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signatures Tab */}
          <TabsContent value="signatures" className="space-y-6">
            <SignatureManager />
          </TabsContent>

          {/* Signed Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Generate Signed Documents</span>
                </CardTitle>
                <CardDescription>
                  Create digitally signed versions of approved documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No approved documents available for signing</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {approvedRequests.map((request) => (
                            <SignedDocumentGenerator
        key={request.id}
        request={{
          ...request,
          studentName: request.studentName,
          studentId: request.studentId
        }}
        onDownload={handleDownload}
      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sign Document Dialog */}
      {showSignDialog && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Sign & Approve Document</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseSignDialog}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Document: <strong>{selectedRequest.fileName}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Student: <strong>{selectedRequest.studentName}</strong>
                  </p>
                </div>
                
                {user?.signature ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Your Signature</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                        <img 
                          src={user.signature} 
                          alt="Faculty Signature" 
                          className="max-h-20 mx-auto"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={handleCloseSignDialog}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          if (selectedRequest && user?.signature) {
                            try {
                              // Sign the document in the backend (it should already be approved)
                              const signatureData = {
                                facultyName: user.name,
                                facultyDesignation: user.designation || user.role,
                                signature: user.signature
                              };
                              
                              console.log('📤 Signing letter in backend...');
                              await ApiService.signLetter(selectedRequest.id, signatureData);
                              console.log('✅ Letter signed in backend');
                              
                              // Now fetch the original document and create signed version
                              console.log('📤 Fetching original document...');
                              const originalDocumentBlob = await ApiService.downloadDocument(selectedRequest.id);
                              console.log('📥 Original document blob:', originalDocumentBlob);
                              
                              // Create signature data for document signing
                              const documentSignatureData: DocumentSignatureData = {
                                signature: user.signature,
                                facultyName: user.name,
                                facultyDesignation: user.designation || user.role,
                                signedAt: new Date().toISOString(),
                                documentId: selectedRequest.id
                              };
                              
                              // Generate signed document
                              console.log('📤 Generating signed document...');
                              const result = await signRealDocument(originalDocumentBlob, documentSignatureData);
                              console.log('📥 Signing result:', result);
                              
                              if (result.success && result.signedDocumentBlob) {
                                // Download the signed document
                                const filename = `SIGNED_${selectedRequest.fileName.replace(/\.[^/.]+$/, '')}_${selectedRequest.id}.html`;
                                console.log('📤 Downloading signed document:', filename);
                                downloadSignedDocument(result.signedDocumentBlob, filename);
                                
                                toast({
                                  title: "Document Approved & Signed!",
                                  description: "The document has been approved and a signed version has been downloaded.",
                                });
                              } else {
                                toast({
                                  title: "Error",
                                  description: result.error || "Failed to generate signed document",
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error('Error signing document:', error);
                              toast({
                                title: "Error",
                                description: "Failed to sign document",
                                variant: "destructive"
                              });
                            }
                            
                            handleCloseSignDialog();
                          }
                        }}
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        Sign & Approve
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <PenTool className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">No signature found</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Please upload your signature first in the Signature Manager tab.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleCloseSignDialog}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Document Dialog */}
      {showRejectDialog && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Reject Document</span>
                </h2>
                <p className="text-sm text-red-600 font-medium mt-1">
                  ⚠️ Rejection reason is mandatory
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseRejectDialog}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting "{selectedRequest.fileName}"
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rejectionReason" className="text-red-600 font-medium">
                    Rejection Reason *
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Please provide a detailed explanation of why this document is being rejected. Include specific areas that need improvement..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="border-red-200 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 10 characters required. Current: {rejectionReason.length} characters
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseRejectDialog}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    disabled={!rejectionReason.trim() || rejectionReason.trim().length < 10}
                    onClick={() => {
                      if (selectedRequest) {
                        handleReject(selectedRequest.id, rejectionReason);
                        handleCloseRejectDialog();
                      }
                    }}
                  >
                    Reject Document
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Details Dialog */}
      {showDetailsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Document Details</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              {selectedDocument && (
                <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Student Name</Label>
                  <p className="text-sm">{selectedDocument.studentName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Student ID</Label>
                  <p className="text-sm">{selectedDocument.studentId}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">File Name</Label>
                  <p className="text-sm">{selectedDocument.fileName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge 
                    variant={selectedDocument.status === 'approved' ? 'default' : 
                            selectedDocument.status === 'rejected' ? 'destructive' : 'secondary'}
                  >
                    {selectedDocument.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="text-sm mt-1">{selectedDocument.summary}</p>
              </div>
              
              {/* Letter Content Display */}
              {(selectedDocument as any).content && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Letter Content</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {(selectedDocument as any).content}
                    </pre>
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Approval Path</Label>
                <p className="text-sm mt-1">{selectedDocument.approvalPath}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Submitted At</Label>
                  <p className="text-sm">{new Date(selectedDocument.submittedAt).toLocaleString()}</p>
                </div>
                {selectedDocument.approvedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Approved At</Label>
                    <p className="text-sm">{new Date(selectedDocument.approvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              {selectedDocument.approvedBy && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Approved By</Label>
                  <p className="text-sm">{selectedDocument.approvedBy}</p>
                </div>
              )}
              
              {selectedDocument.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Rejection Reason</Label>
                  <p className="text-sm text-red-600">{selectedDocument.rejectionReason}</p>
                </div>
              )}
              
              {/* Show workflow details if available */}
              {(selectedDocument as any).workflowStep && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current Workflow Step</Label>
                  <p className="text-sm">{(selectedDocument as any).workflowStep}</p>
                </div>
              )}
              
              {(selectedDocument as any).currentApprover && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current Approver</Label>
                  <p className="text-sm">{(selectedDocument as any).currentApprover}</p>
                </div>
              )}
              
              {/* Show assigned faculty if available */}
              {((selectedDocument as any).assignedMentor || (selectedDocument as any).assignedHOD || (selectedDocument as any).assignedDean) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Assigned Faculty</Label>
                  <div className="text-sm space-y-1">
                    {(selectedDocument as any).assignedMentor && (
                      <p><strong>Mentor:</strong> {(selectedDocument as any).assignedMentor}</p>
                    )}
                    {(selectedDocument as any).assignedHOD && (
                      <p><strong>HOD:</strong> {(selectedDocument as any).assignedHOD}</p>
                    )}
                    {(selectedDocument as any).assignedDean && (
                      <p><strong>Dean:</strong> {(selectedDocument as any).assignedDean}</p>
                    )}
                  </div>
                </div>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer */}
      {showDocumentViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedDocument(null);
          }}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default FacultyDashboard;