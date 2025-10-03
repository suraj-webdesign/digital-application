import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Download, 
  User, 
  Calendar,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface DocumentViewerProps {
  document: {
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
    content?: string;
    fileUrl?: string;
  };
  onClose: () => void;
  onStatusChange: (documentId: string, status: 'approved' | 'rejected', reason?: string) => void;
}

const DocumentViewer = ({ document, onClose, onStatusChange }: DocumentViewerProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [documentContent] = useState(document.content || '');

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(document.id, 'approved');
      toast({
        title: "Document Approved",
        description: "The document has been approved successfully.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onStatusChange(document.id, 'rejected', rejectionReason);
      toast({
        title: "Document Rejected",
        description: "The document has been rejected with the provided reason.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (document.fileUrl) {
        // Download the actual file
        const link = (document as any).createElement('a');
        link.href = document.fileUrl;
        link.download = document.fileName;
        (document as any).body.appendChild(link);
        link.click();
        (document as any).body.removeChild(link);
      } else {
        // Generate and download the document content
        const content = documentContent || document.summary;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = (document as any).createElement('a');
        link.href = url;
        link.download = `${document.fileName}.txt`;
        (document as any).body.appendChild(link);
        link.click();
        (document as any).body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Download Started",
        description: "The document is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Document Review</h2>
              <p className="text-sm text-gray-500">{document.fileName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Document Info Sidebar */}
          <div className="w-80 border-r p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Document Status */}
              <div>
                <h3 className="font-semibold mb-3">Document Status</h3>
                <Badge className={getStatusColor(document.status)}>
                  {document.status.toUpperCase()}
                </Badge>
              </div>

              {/* Student Information */}
              <div>
                <h3 className="font-semibold mb-3">Student Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{document.studentName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{document.studentId}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Submitted: {new Date(document.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {document.approvedAt && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Approved: {new Date(document.approvedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {document.approvedBy && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">By: {document.approvedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Path */}
              <div>
                <h3 className="font-semibold mb-3">Approval Path</h3>
                <p className="text-sm text-gray-600">{document.approvalPath}</p>
              </div>

              {/* Rejection Reason */}
              {document.rejectionReason && (
                <div>
                  <h3 className="font-semibold mb-3">Rejection Reason</h3>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{document.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>

                {document.status === 'pending' && (
                  <>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve Document
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => setShowRejectForm(!showRejectForm)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Document
                    </Button>

                    {showRejectForm && (
                      <div className="space-y-3 p-4 border border-red-200 rounded-lg bg-red-50">
                        <div>
                          <Label htmlFor="rejectionReason" className="text-red-800 font-medium">
                            Rejection Reason *
                          </Label>
                          <Textarea
                            id="rejectionReason"
                            placeholder="Please provide a detailed reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-2"
                            rows={4}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleReject}
                            disabled={isLoading || !rejectionReason.trim()}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Confirm Rejection
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setShowRejectForm(false);
                              setRejectionReason('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Document Content</h3>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div 
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ 
                      fontFamily: "'Times New Roman', Times, serif", 
                      fontSize: '12pt',
                      lineHeight: '1.6'
                    }}
                  >
                    {documentContent || document.summary || 'Document content not available.'}
                  </div>
                </CardContent>
              </Card>

              {!documentContent && !document.summary && (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Content Not Available</h3>
                  <p className="text-gray-500">The document content could not be loaded.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
