import { useState } from 'react';
import { Button } from '@/components/ui/button';
// Removed unused Card imports
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Printer,
  Share2,
  CheckCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react';

interface DocumentPreviewProps {
  document: {
    id: string;
    fileName: string;
    studentName: string;
    studentId: string;
    summary: string;
    approvalPath: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    approvedAt?: string;
    approvedBy?: string;
    signatures?: Array<{
      name: string;
      designation: string;
      signature: string;
      signedAt: string;
      role: 'mentor' | 'hod' | 'dean' | 'admin';
    }>;
  };
  onClose: () => void;
}

const DocumentPreview = ({ document, onClose }: DocumentPreviewProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Generate the document using the new template
      const documentMetadata = {
        fileName: document.fileName,
        studentName: document.studentName,
        studentId: document.studentId,
        summary: document.summary,
        approvalPath: document.approvalPath,
        submittedAt: document.submittedAt,
        approvedAt: document.approvedAt || new Date().toISOString(),
        approvedBy: document.approvedBy || 'System',
        facultySignature: '', // Will be populated from actual signature
        facultyName: 'Dr. Faculty Name',
        facultyDesignation: 'Professor',
        signatures: document.signatures || []
      };

      // Create a blob with the HTML content
      const htmlContent = generateDocumentHTML(documentMetadata);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = (document as any).createElement('a');
      link.href = url;
      link.download = `${document.fileName}.html`;
      (document as any).body.appendChild(link);
      link.click();
      (document as any).body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Document Downloaded",
        description: "The document has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const documentMetadata = {
        fileName: document.fileName,
        studentName: document.studentName,
        studentId: document.studentId,
        summary: document.summary,
        approvalPath: document.approvalPath,
        submittedAt: document.submittedAt,
        approvedAt: document.approvedAt || new Date().toISOString(),
        approvedBy: document.approvedBy || 'System',
        facultySignature: '',
        facultyName: 'Dr. Faculty Name',
        facultyDesignation: 'Professor',
        signatures: document.signatures || []
      };

      const htmlContent = generateDocumentHTML(documentMetadata);
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
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
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Document Preview</h2>
              <p className="text-sm text-gray-500">{document.fileName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(document.status)}>
              {document.status.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Document Info Sidebar */}
          <div className="w-80 border-r p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Document Status */}
              <div>
                <h3 className="font-semibold mb-3">Document Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{document.studentName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{document.studentId}</span>
                  </div>
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
                </div>
              </div>

              {/* Signatures */}
              {document.signatures && document.signatures.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Signatures</h3>
                  <div className="space-y-2">
                    {document.signatures.map((sig, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="text-sm font-medium">{sig.name}</p>
                        <p className="text-xs text-gray-500">{sig.designation}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(sig.signedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={handleDownload}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Document
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({
                      title: "Link Copied",
                      description: "Document link copied to clipboard.",
                    });
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Link
                </Button>
              </div>
            </div>
          </div>

          {/* Document Preview */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div 
                className="p-8"
                dangerouslySetInnerHTML={{ 
                  __html: generateDocumentHTML({
                    fileName: document.fileName,
                    studentName: document.studentName,
                    studentId: document.studentId,
                    summary: document.summary,
                    approvalPath: document.approvalPath,
                    submittedAt: document.submittedAt,
                    approvedAt: document.approvedAt || new Date().toISOString(),
                    approvedBy: document.approvedBy || 'System',
                    facultySignature: '',
                    facultyName: 'Dr. Faculty Name',
                    facultyDesignation: 'Professor',
                    signatures: document.signatures || []
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to generate document HTML (simplified version)
const generateDocumentHTML = (metadata: any) => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${metadata.fileName}</title>
      <style>
        body { 
          font-family: 'Times New Roman', Times, serif; 
          margin: 0;
          padding: 20px;
          line-height: 1.6;
          color: #000;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .veltech-logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          margin-right: 15px;
        }
        .university-info h1 {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
          margin: 0;
          text-transform: uppercase;
        }
        .university-info p {
          font-size: 12px;
          color: #666;
          margin: 5px 0 0 0;
        }
        .document-title {
          font-size: 20px;
          font-weight: bold;
          color: #1e40af;
          margin: 15px 0 5px 0;
          text-transform: uppercase;
        }
        .document-info {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-weight: bold;
          color: #374151;
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .info-value {
          color: #111827;
          font-size: 12px;
        }
        .content {
          margin-bottom: 30px;
        }
        .content h2 {
          font-size: 16px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 3px;
        }
        .content p {
          margin-bottom: 10px;
          text-align: justify;
          font-size: 12px;
          line-height: 1.6;
        }
        .signature-section {
          margin-top: 40px;
          border-top: 2px solid #e5e7eb;
          padding-top: 20px;
        }
        .signature-title {
          font-size: 16px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 20px;
          text-align: center;
        }
        .signatures-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 40px;
          flex-wrap: wrap;
        }
        .signature-block {
          text-align: center;
          padding: 0;
          border: none;
          background: transparent;
          flex: 1;
          min-width: 150px;
          max-width: 200px;
        }
        .signature-image {
          width: 140px;
          height: 60px;
          border: 1px solid #d1d5db;
          background: white;
          margin: 0 auto 15px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 10px;
          color: #6b7280;
        }
        .signature-image img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .signature-line {
          border-bottom: 2px solid #000;
          width: 140px;
          margin: 0 auto 10px auto;
          height: 2px;
        }
        .signature-name {
          font-weight: bold;
          font-size: 12px;
          color: #111827;
          margin-bottom: 5px;
          font-family: 'Brush Script MT', 'Lucida Handwriting', cursive;
          transform: rotate(-1deg);
        }
        .signature-title-text {
          font-size: 10px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        .signature-date {
          font-size: 10px;
          color: #6b7280;
          font-style: italic;
        }
        .approval-stamp {
          position: absolute;
          top: 80px;
          right: 30px;
          background: linear-gradient(135deg, #059669, #10b981);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          transform: rotate(15deg);
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 48px;
          color: rgba(30, 64, 175, 0.05);
          z-index: -1;
          pointer-events: none;
          font-weight: bold;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="watermark">APPROVED</div>
      <div class="approval-stamp">APPROVED</div>
      
      <div class="header">
        <div class="logo-section">
          <div class="veltech-logo">VU</div>
          <div class="university-info">
            <h1>Veltech University</h1>
            <p>Digital Document Approval System</p>
          </div>
        </div>
        <div class="document-title">${metadata.fileName}</div>
      </div>

      <div class="document-info">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Student Name</div>
            <div class="info-value">${metadata.studentName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Student ID</div>
            <div class="info-value">${metadata.studentId}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Submitted Date</div>
            <div class="info-value">${new Date(metadata.submittedAt).toLocaleDateString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Approved Date</div>
            <div class="info-value">${new Date(metadata.approvedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div class="content">
        <h2>Document Summary</h2>
        <p>${metadata.summary}</p>
        
        <h2>Approval Details</h2>
        <p><strong>Approval Path:</strong> ${metadata.approvalPath}</p>
        <p><strong>Approved By:</strong> ${metadata.approvedBy}</p>
        <p><strong>Document Status:</strong> Approved and Digitally Signed</p>
      </div>

      <div class="signature-section">
        <div class="signature-title">Digital Signatures</div>
        <div class="signatures-grid">
          <div class="signature-block">
            <div class="signature-image">${metadata.facultyName}</div>
            <div class="signature-line"></div>
            <div class="signature-name">${metadata.facultyName}</div>
            <div class="signature-title-text">${metadata.facultyDesignation}</div>
            <div class="signature-date">Date: ${currentDate}</div>
          </div>
          ${metadata.signatures.map((sig: any) => `
            <div class="signature-block">
              <div class="signature-image">${sig.name}</div>
              <div class="signature-line"></div>
              <div class="signature-name">${sig.name}</div>
              <div class="signature-title-text">${sig.designation}</div>
              <div class="signature-date">Date: ${new Date(sig.signedAt).toLocaleDateString()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
};

export default DocumentPreview;
