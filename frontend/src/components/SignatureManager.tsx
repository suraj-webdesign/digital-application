import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, PenTool, Download, Trash2, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import ApiService from '@/services/api';

const SignatureManager = () => {
  const { user, updateSignature, removeSignature } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'upload' | 'draw'>('upload');
  const [signatureStatus, setSignatureStatus] = useState<{
    hasSignature: boolean;
    signatureUploadedAt?: string;
    isSignatureActive: boolean;
    signatureSize: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check signature status on component mount
  useEffect(() => {
    checkSignatureStatus();
  }, []);

  const checkSignatureStatus = async () => {
    if (!user?._id) return;
    
    setIsCheckingStatus(true);
    try {
      const status = await ApiService.getSignatureStatus();
      setSignatureStatus(status);
    } catch (error) {
      console.error('Error checking signature status:', error);
      toast({
        title: "Error",
        description: "Failed to check signature status",
        variant: "destructive"
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setIsLoading(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const result = event.target?.result as string;
            
            // Upload to backend
            await ApiService.uploadSignature(result);
            
            // Update local state
            updateSignature(result);
            
            // Refresh signature status
            await checkSignatureStatus();
            
            toast({
              title: "Signature uploaded!",
              description: "Your signature has been saved successfully",
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error uploading signature:', error);
          toast({
            title: "Upload failed",
            description: "Failed to upload signature. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setIsLoading(true);
      try {
        const dataURL = canvas.toDataURL('image/png');
        
        // Upload to backend
        await ApiService.uploadSignature(dataURL);
        
        // Update local state
        updateSignature(dataURL);
        
        // Refresh signature status
        await checkSignatureStatus();
        
        toast({
          title: "Signature saved!",
          description: "Your drawn signature has been saved successfully",
        });
        
        // Clear canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch (error) {
        console.error('Error saving signature:', error);
        toast({
          title: "Save failed",
          description: "Failed to save signature. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleRemoveSignature = async () => {
    setIsLoading(true);
    try {
      // Remove from backend
      await ApiService.removeSignature();
      
      // Update local state
      removeSignature();
      
      // Refresh signature status
      await checkSignatureStatus();
      
      toast({
        title: "Signature removed",
        description: "Your signature has been removed",
      });
    } catch (error) {
      console.error('Error removing signature:', error);
      toast({
        title: "Remove failed",
        description: "Failed to remove signature. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSignature = () => {
    if (user?.signature) {
      const link = document.createElement('a');
      link.href = user.signature;
      link.download = `${user?.name || 'signature'}_signature.png`;
      link.click();
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PenTool className="h-5 w-5" />
            <span>Digital Signature Management</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSignatureStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          Upload or draw your digital signature for document approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signature Status */}
        <div className="space-y-3">
          <Label>Signature Status</Label>
          <div className="flex items-center space-x-3">
            {signatureStatus ? (
              <>
                {signatureStatus.hasSignature ? (
                  <Badge variant="default" className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Active</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Not Uploaded</span>
                  </Badge>
                )}
                {signatureStatus.signatureUploadedAt && (
                  <span className="text-sm text-muted-foreground">
                    Uploaded: {new Date(signatureStatus.signatureUploadedAt).toLocaleDateString()}
                  </span>
                )}
                {signatureStatus.signatureSize > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Size: {(signatureStatus.signatureSize / 1024).toFixed(1)} KB
                  </span>
                )}
              </>
            ) : (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Checking...</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Current Signature Display */}
        {user?.signature && (
          <div className="space-y-3">
            <Label>Current Signature</Label>
            <div className="border border-border rounded-lg p-4 bg-muted/20">
              <img 
                src={user?.signature} 
                alt="Your signature" 
                className="max-h-20 object-contain mx-auto"
              />
              <div className="text-center mt-2 text-sm text-muted-foreground">
                Uploaded: {user?.signatureUploadedAt ? new Date(user.signatureUploadedAt).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadSignature} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="destructive" size="sm" onClick={handleRemoveSignature} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Signature Creation Options */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={drawingMode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDrawingMode('upload')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
            <Button
              variant={drawingMode === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDrawingMode('draw')}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Draw Signature
            </Button>
          </div>

          {drawingMode === 'upload' && (
            <div className="space-y-3">
              <Label htmlFor="signature-upload">Upload Signature Image</Label>
              <Input
                id="signature-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="bg-background"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: PNG, JPG, JPEG. Recommended size: 200x100px
              </p>
              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Uploading signature...</span>
                </div>
              )}
            </div>
          )}

          {drawingMode === 'draw' && (
            <div className="space-y-3">
              <Label>Draw Your Signature</Label>
              <div className="border border-border rounded-lg p-4 bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="border border-gray-300 rounded cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ touchAction: 'none' }}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveDrawing} size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save Signature
                </Button>
                <Button variant="outline" onClick={clearCanvas} size="sm" disabled={isLoading}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use your mouse to draw your signature. Click "Save Signature" when done.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignatureManager;
