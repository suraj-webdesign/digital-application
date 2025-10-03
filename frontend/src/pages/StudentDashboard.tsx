import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import ELetterGenerator from '@/components/ELetterGenerator';
import Chatbot from '@/components/Chatbot';
import { FileText, Clock, CheckCircle, XCircle, Eye, Download, Calendar, User, PenTool, Users, Bell, Send, RefreshCw } from 'lucide-react';

interface DocumentRequest {
  id: string;
  fileName: string;
  summary: string;
  approvalPath: string;
  status: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  downloadHistory?: DownloadRecord[];
}

interface DownloadRecord {
  id: string;
  downloadedAt: string;
  downloadedBy: string;
  userRole: string;
  ipAddress?: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { lastUpdate, isConnected } = useWebSocket();
  
  
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  useEffect(() => {
    loadUserLetters();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadUserLetters();
    }, 30000); // 30 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastUpdate && lastUpdate.type === 'approval_updated') {
      const updateData = lastUpdate.data;
      
      // Check if this update is relevant to the current user
      if (updateData.studentId === user?._id) {
        console.log('📡 Real-time approval update received:', updateData);
        
        // Show toast notification
        toast({
          title: "Letter Status Updated",
          description: `Your letter has been ${updateData.status} by ${updateData.approverName}`,
        });
        
        // Only refresh if it's not our own action and not too frequent to prevent infinite loop
        const currentTime = Date.now();
        if (updateData.facultyId !== user?._id && (currentTime - lastRefreshTime) > 2000) {
          setLastRefreshTime(currentTime);
          loadUserLetters();
        }
      }
    }
  }, [lastUpdate, user, toast, lastRefreshTime]);


  const getWorkflowPath = (doc: any) => {
    const path = [];
    if (doc.assignedMentor) path.push('Mentor');
    if (doc.assignedHOD) path.push('HOD');
    if (doc.assignedDean) path.push('Dean');
    return path.length > 0 ? path.join(' → ') : 'No workflow assigned';
  };

  const handleViewDetails = (request: DocumentRequest) => {
    setSelectedDocument(request);
    setShowDetailsDialog(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsDialog(false);
    setSelectedDocument(null);
  };

  const handleSendReminder = (request: DocumentRequest) => {
    setSelectedDocument(request);
    setReminderMessage('');
    setShowReminderDialog(true);
  };

  const handleCloseReminder = () => {
    setShowReminderDialog(false);
    setSelectedDocument(null);
    setReminderMessage('');
  };

  const handleSubmitReminder = async () => {
    if (!selectedDocument) return;
    
    setSendingReminder(true);
    try {
      const result = await ApiService.sendReminder(selectedDocument.id, reminderMessage);
      
      toast({
        title: "Reminder Sent Successfully",
        description: `Reminder sent to ${result.data.recipient.role} (${result.data.recipient.name}). You can send another reminder in 24 hours.`,
      });
      
      // Refresh the letters list to show updated reminder count
      loadUserLetters();
      handleCloseReminder();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Failed to Send Reminder",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleDownloadCleanLetter = async (request: DocumentRequest) => {
    try {
      console.log('📤 Starting letter download for:', request);
      
      // Determine PDF type based on letter status
      const pdfType = request.status === 'signed' ? 'signed' : 'clean';
      console.log('📄 Downloading PDF type:', pdfType);
      
      // Download the appropriate PDF directly
      let letterBlob;
      let filename;
      
      if (pdfType === 'signed') {
        letterBlob = await ApiService.downloadSignedPDF(request.id);
        filename = `SIGNED_${request.fileName}_${request.id}.pdf`;
        console.log('📥 Signed PDF blob:', letterBlob);
      } else {
        letterBlob = await ApiService.downloadCleanPDF(request.id);
        filename = `CLEAN_${request.fileName}_${request.id}.pdf`;
        console.log('📥 Clean PDF blob:', letterBlob);
      }

      const url = URL.createObjectURL(letterBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: `${pdfType === 'signed' ? 'Signed' : 'Clean'} PDF Downloaded!`,
        description: `Your ${pdfType} letter PDF has been downloaded successfully.`,
      });

    } catch (error) {
      console.error('❌ Error downloading letter:', error);
      toast({
        title: "Error",
        description: `Failed to download letter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleDownloadSignedDocument = async (request: DocumentRequest) => {
    try {
      console.log('📤 Starting signed letter download for:', request);
      
      if (request.status === 'signed') {
        // Generate and download signed PDF
        try {
          console.log('📤 Downloading signed PDF from backend...');
          
          // Download the signed PDF directly
          const signedLetterBlob = await ApiService.downloadSignedPDF(request.id);
          console.log('📥 Signed PDF blob:', signedLetterBlob);
          
          // Create download link for signed PDF
          const url = URL.createObjectURL(signedLetterBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `SIGNED_${request.fileName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Signed PDF Downloaded!",
            description: "Your signed letter PDF has been downloaded successfully.",
          });
          
          return;
        } catch (signedDownloadError) {
          console.log('⚠️ Signed letter download failed:', signedDownloadError);
          
          // Fallback: try to download the regular letter content
          try {
            console.log('📤 Trying fallback: downloading regular letter content...');
            const letterBlob = await ApiService.downloadLetter(request.id);
            console.log('📥 Letter blob:', letterBlob);
            
            const url = URL.createObjectURL(letterBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `LETTER_${request.fileName}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
              
              toast({
              title: "Letter Downloaded",
              description: "Letter content has been downloaded (signed version not available).",
              });
            
              return;
          } catch (fallbackError) {
            console.log('❌ Fallback download also failed:', fallbackError);
            throw fallbackError;
            }
        }
      }
      
      // Fallback: Download the original letter (for approved or if signed version fails)
      console.log('📤 Downloading original letter...');
      const letterBlob = await ApiService.downloadLetter(request.id);
      console.log('📥 Letter blob:', letterBlob);
      
      // Create a simple download
      const filename = request.status === 'signed' 
        ? `SIGNED_${request.fileName}_${request.id}.html`
        : `APPROVED_${request.fileName}_${request.id}.html`;
      
      const url = URL.createObjectURL(letterBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Letter Downloaded!",
        description: `Your ${request.status === 'signed' ? 'signed' : 'approved'} letter has been downloaded successfully.`,
      });
      
    } catch (error) {
      console.error('❌ Error downloading letter:', error);
      toast({
        title: "Error",
        description: `Failed to download letter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const loadUserLetters = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getUserLetters();
      if (response.success) {
        // Transform API data to match our interface
        const transformedRequests = response.data.letters.map((letter: any) => ({
          id: letter._id,
          fileName: letter.title,
          summary: `Letter: ${letter.title}`,
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
          proofFile: letter.proofFile
        }));
        setRequests(transformedRequests);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error('Error loading letters:', error);
      toast({
        title: "Error",
        description: "Failed to load your letters",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };




  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'signed': return 'status-signed';
      case 'rejected': return 'status-rejected';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'signed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'approved': return 'Approved (Ready for Signing)';
      case 'signed': return 'Digitally Signed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-responsive py-4 sm:py-6">
        {/* Clean Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full space-y-4 lg:space-y-0">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, <span className="font-semibold text-blue-600">{user?.name}</span></p>
              <p className="text-sm text-gray-500 mt-1">Create and manage your formal letters with digital approval workflow</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:flex-col lg:space-x-0 lg:space-y-2">
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={loadUserLetters}
                  variant="outline" 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
                {/* WebSocket Connection Status */}
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
              {lastRefreshed && (
                <p className="text-xs text-gray-500">
                  Last updated: {lastRefreshed.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Clean Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* E-Letter Generator */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="shadow-sm border">
              <CardHeader className="bg-blue-600 text-white rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <PenTool className="h-5 w-5 sm:h-6 sm:w-6" />
                  <div>
                    <span>Create E-Letter</span>
                    <p className="text-blue-100 text-sm font-normal mt-1">
                      Use templates to create formal letters and submit for approval
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[400px] sm:h-[500px] lg:h-[600px] overflow-y-auto custom-scrollbar">
                <ELetterGenerator />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Letters */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="shadow-sm border">
              <CardHeader className="bg-green-600 text-white rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  <div>
                    <span>My Letters</span>
                    <p className="text-green-100 text-sm font-normal mt-1">
                      Track the status of your submitted letters
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col">
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Loading your letters...</p>
                      </div>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2">No letters submitted yet</h3>
                      <p className="text-sm text-gray-500 mb-4">Create your first E-Letter to get started with the approval process</p>
                      <div className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg">
                        <PenTool className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Start by creating a letter</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Letters Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b border-gray-200 space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <h3 className="text-sm font-semibold text-gray-900">Your Letters</h3>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            {requests.length} {requests.length === 1 ? 'letter' : 'letters'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {/* Letters List */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {requests.map((request) => (
                        <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 space-y-2 sm:space-y-0">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <h3 className="font-semibold text-gray-900 text-base">{request.fileName}</h3>
                              </div>
                              <p className="text-xs text-gray-500">
                                Submitted on {new Date(request.submittedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="sm:ml-4">
                              <Badge className={`${getStatusColor(request.status)} px-2 py-1 text-xs font-medium`}>
                                <span className="flex items-center space-x-1">
                                  {getStatusIcon(request.status)}
                                  <span>{getStatusText(request.status)}</span>
                                </span>
                              </Badge>
                            </div>
                          </div>
                        
                          {/* Letter Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div className="space-y-2">
                              <div className="flex items-start space-x-2">
                                <FileText className="h-3 w-3 text-gray-600 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-gray-900">Letter Type</p>
                                  <p className="text-xs text-gray-600">{request.summary}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-2">
                                <Users className="h-3 w-3 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-gray-900">Approval Path</p>
                                  <p className="text-xs text-gray-600">{request.approvalPath}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {request.approvedAt && (
                                <div className="flex items-start space-x-2">
                                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-gray-900">Approved On</p>
                                    <p className="text-xs text-gray-600">{formatDate(request.approvedAt)}</p>
                                  </div>
                                </div>
                              )}
                              
                              {request.approvedBy && (
                                <div className="flex items-start space-x-2">
                                  <User className="h-3 w-3 text-purple-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-gray-900">Approved By</p>
                                    <p className="text-xs text-gray-600">{request.approvedBy}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {request.rejectionReason && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                              <div className="flex items-start space-x-2">
                                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-900">Rejection Reason</p>
                                  <p className="text-sm text-red-700 mt-1">{request.rejectionReason}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Download History */}
                          {request.downloadHistory && request.downloadHistory.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded border">
                              <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
                                <Download className="h-3 w-3" />
                                <span>Download History</span>
                              </h4>
                              <div className="space-y-1">
                                {request.downloadHistory.map((record) => (
                                  <div key={record.id} className="flex items-center justify-between text-xs text-gray-600">
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(record.downloadedAt)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <User className="h-3 w-3" />
                                      <span>{record.downloadedBy}</span>
                                      <Badge variant="outline" size="sm">{record.userRole}</Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        
                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-gray-200 space-y-2 sm:space-y-0">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center space-x-2"
                              onClick={() => handleViewDetails(request)}
                            >
                              <Eye className="h-3 w-3" />
                              <span>View Details</span>
                            </Button>
                              
                              {request.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex items-center space-x-2"
                                  onClick={() => handleSendReminder(request)}
                                >
                                  <Bell className="h-3 w-3" />
                                  <span>Send Reminder</span>
                                </Button>
                              )}
                            </div>
                            
                            {(request.status === 'approved' || request.status === 'signed') && (
                              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDownloadCleanLetter(request)}
                                  className="flex items-center space-x-2"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>
                                    {request.status === 'signed' ? 'Download Signed Letter' : 'Download Letter'}
                                  </span>
                                </Button>
                                {request.status === 'signed' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleDownloadSignedDocument(request)}
                                className="flex items-center space-x-2"
                              >
                                <Download className="h-3 w-3" />
                                    <span>Download Signed Letter</span>
                              </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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

      {/* Reminder Dialog */}
      {showReminderDialog && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <span>Send Reminder</span>
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseReminder}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Bell className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-orange-900">Reminder for: {selectedDocument.fileName}</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        This will send a friendly reminder to the faculty member currently reviewing your letter.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reminderMessage" className="text-sm font-medium text-gray-700">
                    Custom Message (Optional)
                  </Label>
                  <Textarea
                    id="reminderMessage"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="Add a custom message to your reminder (optional)..."
                    className="mt-2"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {reminderMessage.length}/500 characters. Leave empty to use the default message.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <Send className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Reminder Policy</p>
                      <p className="text-xs text-blue-700 mt-1">
                        • You can send one reminder per day per letter<br/>
                        • Reminders are sent to the current approver in the workflow<br/>
                        • Be respectful and professional in your message
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={handleCloseReminder}
                disabled={sendingReminder}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReminder}
                disabled={sendingReminder}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {sendingReminder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminder
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Component */}
      <Chatbot />
    </div>
  );
};

export default StudentDashboard;