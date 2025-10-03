import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createSignedDocument, downloadDocument, DocumentMetadata, DownloadRecord } from '@/utils/documentGenerator';
import { FileText, Download, Eye, Clock, User, Calendar, CheckCircle } from 'lucide-react';

interface DocumentRequest {
  id: string;
  fileName: string;
  summary: string;
  approvalPath: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  downloadHistory?: DownloadRecord[];
  studentName: string;
  studentId: string;
} 
interface SignedDocumentGeneratorProps {
  request: DocumentRequest;
  onDownload: (requestId: string) => void;
}

const SignedDocumentGenerator = ({ request, onDownload }: SignedDocumentGeneratorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSignedDocument = async () => {
    if (!user?.signature) {
      toast({
        title: "No signature found",
        description: "Please upload your signature before generating signed documents",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Create document metadata
      const metadata: DocumentMetadata = {
        fileName: request.fileName,
        studentName: request.studentName,
        studentId: request.studentId,
        summary: request.summary,
        approvalPath: request.approvalPath,
        submittedAt: request.submittedAt,
        approvedAt: request.approvedAt || new Date().toISOString(),
        approvedBy: request.approvedBy || `${user.name} (${user.designation || user.role})`,
        facultySignature: user.signature,
        facultyName: user.name,
        facultyDesignation: user.designation || user.role
      };

      // Create download record
      const downloadRecord: DownloadRecord = {
        id: Date.now().toString(),
        downloadedAt: new Date().toISOString(),
        downloadedBy: user.name,
        userRole: user.role,
        ipAddress: '192.168.1.1' // In real app, get from request
      };

      // Generate signed document
      const { document, documentId, signatureHash } = await createSignedDocument(metadata, downloadRecord);
      
      // Update download history
      const updatedRequest = {
        ...request,
        downloadHistory: [...(request.downloadHistory || []), downloadRecord]
      };

      // In real app, save to database
      console.log('Document generated with signature:', {
        documentId,
        signatureHash,
        downloadRecord: updatedRequest
      });
      
      toast({
        title: "Document generated!",
        description: `Signed document created with ID: ${documentId}`,
      });

      // Download the document
      const filename = `SIGNED_${request.fileName.replace(/\.[^/.]+$/, '')}_${documentId}.html`;
      downloadDocument(document, filename);
      
      // Trigger download callback
      onDownload(request.id);
      
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: "Failed to generate signed document",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Signed Document Generator</span>
        </CardTitle>
        <CardDescription>
          Generate digitally signed documents with approval tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{request.fileName}</h3>
            <Badge className={getStatusColor(request.status)}>
              {request.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Student:</span>
              <p className="text-foreground">{request.studentName} ({request.studentId})</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Submitted:</span>
              <p className="text-foreground">{formatDate(request.submittedAt)}</p>
            </div>
            {request.approvedAt && (
              <div>
                <span className="font-medium text-muted-foreground">Approved:</span>
                <p className="text-foreground">{formatDate(request.approvedAt)}</p>
              </div>
            )}
            {request.approvedBy && (
              <div>
                <span className="font-medium text-muted-foreground">Approved By:</span>
                <p className="text-foreground">{request.approvedBy}</p>
              </div>
            )}
          </div>

          <div>
            <span className="font-medium text-muted-foreground">Summary:</span>
            <p className="text-foreground mt-1">{request.summary}</p>
          </div>

          <div>
            <span className="font-medium text-muted-foreground">Approval Path:</span>
            <p className="text-foreground mt-1">{request.approvalPath}</p>
          </div>
        </div>

        {/* Signature Status */}
        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Digital Signature Status</span>
            </div>
            {user?.signature ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Signature Available
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                No Signature
              </Badge>
            )}
          </div>
          
          {user?.signature && (
            <div className="mt-3 flex items-center space-x-3">
              <img 
                src={user.signature} 
                alt="Your signature" 
                className="h-12 object-contain border border-border rounded bg-white p-1"
              />
              <div className="text-sm text-muted-foreground">
                <p>Signature uploaded: {user.signatureUploadedAt ? new Date(user.signatureUploadedAt).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Download History */}
        {request.downloadHistory && request.downloadHistory.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Download History</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {request.downloadHistory.map((record) => (
                <div key={record.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded border">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{formatDate(record.downloadedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{record.downloadedBy}</span>
                    <Badge variant="outline" size="sm">{record.userRole}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={generateSignedDocument}
            disabled={!user?.signature || isGenerating || request.status !== 'approved'}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Signed Document
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onDownload(request.id)}
            disabled={request.status !== 'approved'}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        {!user?.signature && (
          <p className="text-sm text-warning text-center">
            ⚠️ Please upload your digital signature to generate signed documents
          </p>
        )}

        {request.status !== 'approved' && (
          <p className="text-sm text-muted-foreground text-center">
            Document must be approved before generating signed version
          </p>
        )}

        {/* Document Features Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Generated documents include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Digital signature overlay</li>
            <li>Approval watermark</li>
            <li>Download tracking footer</li>
            <li>Verification hash</li>
            <li>Timestamp and metadata</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignedDocumentGenerator;
