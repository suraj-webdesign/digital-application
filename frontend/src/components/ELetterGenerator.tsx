import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import { FileText, Users, PenTool, Eye, Loader2 } from 'lucide-react';

interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
}

interface FacultyMember {
  _id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
}

// Simple hardcoded templates
const SIMPLE_TEMPLATES: LetterTemplate[] = [
  {
    id: 'application',
    name: 'Application Letter',
    description: 'Template for formal application letters',
    category: 'application',
    template: `From: {{fromName}}
{{fromAddress}}
{{fromEmail}}
{{fromPhone}}

Date: {{date}}

To: {{toName}}
{{toDesignation}}
{{toDepartment}}
{{institutionName}}

Subject: {{subject}}

{{salutation}},

{{mainBody}}

I hope you will consider my application favorably.

Thank you for your time and consideration.

Yours sincerely,
{{fromName}}

_________________________
{{facultySignature}}`,
    fields: [
      { name: 'fromName', label: 'Your Name', type: 'text', required: true, placeholder: 'Enter your full name' },
      { name: 'fromAddress', label: 'Your Address', type: 'textarea', required: true, placeholder: 'Enter your address' },
      { name: 'fromEmail', label: 'Your Email', type: 'text', required: true, placeholder: 'Enter your email' },
      { name: 'fromPhone', label: 'Your Phone', type: 'text', required: true, placeholder: 'Enter your phone number' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'toName', label: 'Recipient Name', type: 'text', required: true, placeholder: 'Enter recipient name' },
      { name: 'toDesignation', label: 'Recipient Designation', type: 'text', required: true, placeholder: 'e.g., HOD, Dean' },
      { name: 'toDepartment', label: 'Department', type: 'text', required: true, placeholder: 'Enter department name' },
      { name: 'institutionName', label: 'Institution Name', type: 'text', required: true, placeholder: 'Enter institution name' },
      { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Enter letter subject' },
      { name: 'salutation', label: 'Salutation', type: 'text', required: true, placeholder: 'e.g., Respected Sir/Madam' },
      { name: 'mainBody', label: 'Main Body', type: 'textarea', required: true, placeholder: 'Write the main content of your letter' },
      { name: 'facultySignature', label: 'Faculty Signature Space', type: 'text', required: false, placeholder: 'Space for faculty signature' }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Letter',
    description: 'Simple notepad to write any custom letter for submission or approval',
    category: 'custom',
    template: `{{customContent}}

_________________________
{{facultySignature}}`,
    fields: [
      { name: 'customContent', label: 'Write Your Letter', type: 'textarea', required: true, placeholder: 'Write your complete letter here. Include all details like your name, recipient details, subject, content, etc. This will be submitted for approval and signing.' }
    ]
  }
];

const ELetterGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [facultyOptions, setFacultyOptions] = useState({
    mentors: [] as FacultyMember[],
    hods: [] as FacultyMember[],
    deans: [] as FacultyMember[]
  });
  const [workflowSelection, setWorkflowSelection] = useState({
    assignedMentor: '',
    assignedHOD: '',
    assignedDean: ''
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    loadFacultyOptions();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    // Always use hardcoded templates for now
    console.log('📤 Using hardcoded templates');
    setTemplates(SIMPLE_TEMPLATES);
    console.log('✅ Loaded templates:', SIMPLE_TEMPLATES.length);
  };

  useEffect(() => {
    if (selectedTemplate) {
      generatePreview();
    }
  }, [selectedTemplate, formData]);


  const loadFacultyOptions = async () => {
    if (!user?.department) {
      console.log('No user department found in E-Letter Generator:', user);
      return;
    }
    
    console.log('Loading faculty options for E-Letter Generator, department:', user.department);
    
    try {
      const [mentorsResponse, hodsResponse, deansResponse] = await Promise.all([
        ApiService.getFacultyByDepartment(user.department, 'Mentor'),
        ApiService.getFacultyByDepartment(user.department, 'HOD'),
        ApiService.getFacultyByDepartment(user.department, 'Dean')
      ]);

      console.log('E-Letter Generator faculty responses:', { mentorsResponse, hodsResponse, deansResponse });

      setFacultyOptions({
        mentors: mentorsResponse.success ? mentorsResponse.data.faculty : [],
        hods: hodsResponse.success ? hodsResponse.data.faculty : [],
        deans: deansResponse.success ? deansResponse.data.faculty : []
      });
    } catch (error) {
      console.error('Error loading faculty options in E-Letter Generator:', error);
      toast({
        title: "Warning",
        description: "Could not load faculty options. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const generatePreview = () => {
    if (!selectedTemplate) return;
    
    let content = selectedTemplate.template;
    Object.keys(formData).forEach(key => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), formData[key] || '');
    });
    setPreviewContent(content);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    const requiredFields = selectedTemplate.fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !formData[field.name]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    if (!workflowSelection.assignedMentor && !workflowSelection.assignedHOD && !workflowSelection.assignedDean) {
      toast({
        title: "Error",
        description: "Please select at least one faculty member for approval",
        variant: "destructive"
      });
      return;
    }

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Not authenticated",
        description: "Please log in to generate letters.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "User not found",
        description: "Please log in again.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 E-Letter generation started');
      console.log('Current user:', user);
      console.log('Auth token:', token);
      console.log('Is authenticated:', !!user && !!token);
      console.log('Selected template:', selectedTemplate);
      console.log('Form data:', formData);
      console.log('Workflow selection:', workflowSelection);
      
      // For Custom Letter, generate locally but still submit to API for workflow
      if (selectedTemplate.id === 'custom') {
        console.log('📝 Generating Custom Letter and submitting for approval...');
        
        // Generate the letter content
        let content = selectedTemplate.template;
        Object.keys(formData).forEach(key => {
          const placeholder = `{{${key}}}`;
          content = content.replace(new RegExp(placeholder, 'g'), formData[key] || '');
        });

        // Create FormData for Custom Letter submission
        const formDataToSend = new FormData();
        formDataToSend.append('templateId', selectedTemplate.id);
        formDataToSend.append('title', `Custom Letter - ${new Date().toLocaleDateString()}`);
        formDataToSend.append('fields', JSON.stringify(formData));
        formDataToSend.append('content', content); // Add the generated content
        
        // Add workflow assignments if provided
        if (workflowSelection.assignedMentor && workflowSelection.assignedMentor.trim()) {
          formDataToSend.append('assignedMentor', workflowSelection.assignedMentor);
        }
        if (workflowSelection.assignedHOD && workflowSelection.assignedHOD.trim()) {
          formDataToSend.append('assignedHOD', workflowSelection.assignedHOD);
        }
        if (workflowSelection.assignedDean && workflowSelection.assignedDean.trim()) {
          formDataToSend.append('assignedDean', workflowSelection.assignedDean);
        }
        
        // Add proof file if provided
        if (proofFile) {
          formDataToSend.append('proofFile', proofFile);
        }

        console.log('📤 Submitting Custom Letter to API for workflow...');
        console.log('📤 FormData contents:');
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`  ${key}:`, value);
        }
        console.log('📤 FormData size:', formDataToSend.get('content')?.toString().length || 0, 'characters');
        console.log('📤 Proof file:', proofFile ? `${proofFile.name} (${proofFile.size} bytes)` : 'None');
        
        const response = await ApiService.generateLetter(formDataToSend);
        console.log('📥 Custom Letter submission response:', response);

        if (response.success) {
          toast({
            title: "Custom Letter Submitted!",
            description: "Your custom letter has been submitted for approval.",
          });
          
          // Reset form
          setSelectedTemplate(null);
          setFormData({});
          setWorkflowSelection({ assignedMentor: '', assignedHOD: '', assignedDean: '' });
          setProofFile(null);
          setPreviewContent('');
        } else {
          throw new Error(response.message || 'Failed to submit custom letter');
        }
        
        return;
      }
      
      // For Application Letter, use API
      console.log('📤 Generating Application Letter via API...');
      
      // Generate the letter content
      let content = selectedTemplate.template;
      Object.keys(formData).forEach(key => {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), formData[key] || '');
      });

      // Create FormData to include proof file
      const formDataToSend = new FormData();
      formDataToSend.append('templateId', selectedTemplate.id);
      formDataToSend.append('title', `${selectedTemplate.name} - ${formData.fromName || 'Letter'}`);
      formDataToSend.append('fields', JSON.stringify(formData));
      
      // Add workflow assignments if provided
      if (workflowSelection.assignedMentor && workflowSelection.assignedMentor.trim()) {
        formDataToSend.append('assignedMentor', workflowSelection.assignedMentor);
      }
      if (workflowSelection.assignedHOD && workflowSelection.assignedHOD.trim()) {
        formDataToSend.append('assignedHOD', workflowSelection.assignedHOD);
      }
      if (workflowSelection.assignedDean && workflowSelection.assignedDean.trim()) {
        formDataToSend.append('assignedDean', workflowSelection.assignedDean);
      }
      
      // Add proof file if provided
      if (proofFile) {
        formDataToSend.append('proofFile', proofFile);
      }

      console.log('📤 Sending letter data to API with proof file:', proofFile?.name || 'No proof file');
      
      const response = await ApiService.generateLetter(formDataToSend);
      console.log('📥 Letter generation response:', response);

      if (response.success) {
        toast({
          title: "Application Letter Generated!",
          description: "Your application letter has been created and submitted for approval.",
        });
        
        // Reset form
        setSelectedTemplate(null);
        setFormData({});
        setWorkflowSelection({ assignedMentor: '', assignedHOD: '', assignedDean: '' });
        setProofFile(null);
        setPreviewContent('');
      } else {
        throw new Error(response.message || 'Failed to generate letter');
      }
      
    } catch (error) {
      console.error('❌ Error generating letter:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific error types
        if (error.message.includes('Invalid token')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('403')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        }
      }
      
      toast({
        title: "Error",
        description: `Failed to generate letter: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.name] || '';
    
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="bg-background"
            rows={3}
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.name, val)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            id={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="bg-background"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose a Letter Template</h3>
          <p className="text-sm text-gray-600">Select a template to create your formal letter</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedTemplate?.id === template.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <FileText className={`h-5 w-5 ${
                    selectedTemplate?.id === template.id ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {template.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Form Fields */}
      {selectedTemplate && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PenTool className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Fill Letter Details</h3>
                <p className="text-sm text-gray-600">Complete the form to generate your letter</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTemplate.fields.map((field) => (
                <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <div className="mt-1">
                    {renderField(field)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Approval Workflow</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Select Mentor (Optional)</Label>
                <select
                  value={workflowSelection.assignedMentor}
                  onChange={(e) => {
                    console.log('E-Letter Mentor selected:', e.target.value);
                    setWorkflowSelection(prev => ({ ...prev, assignedMentor: e.target.value }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Select mentor</option>
                  {facultyOptions.mentors.map((mentor) => (
                    <option key={mentor._id} value={mentor._id}>
                      {mentor.name} ({mentor.designation})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selected: {workflowSelection.assignedMentor || 'None'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select HOD (Optional)</Label>
                <select
                  value={workflowSelection.assignedHOD}
                  onChange={(e) => {
                    console.log('E-Letter HOD selected:', e.target.value);
                    setWorkflowSelection(prev => ({ ...prev, assignedHOD: e.target.value }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Select HOD</option>
                  {facultyOptions.hods.map((hod) => (
                    <option key={hod._id} value={hod._id}>
                      {hod.name} ({hod.designation})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selected: {workflowSelection.assignedHOD || 'None'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Dean (Optional)</Label>
                <select
                  value={workflowSelection.assignedDean}
                  onChange={(e) => {
                    console.log('E-Letter Dean selected:', e.target.value);
                    setWorkflowSelection(prev => ({ ...prev, assignedDean: e.target.value }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Select Dean</option>
                  {facultyOptions.deans.map((dean) => (
                    <option key={dean._id} value={dean._id}>
                      {dean.name} ({dean.designation})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selected: {workflowSelection.assignedDean || 'None'}
                </p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">Workflow Information:</p>
              <p>• Select at least one faculty member for approval</p>
              <p>• Letter will be routed to selected faculty in order: Mentor → HOD → Dean</p>
              <p>• Faculty will be able to e-sign the letter after approval</p>
            </div>
          </div>

          {/* Proof Attachment */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Proof Attachment (Optional)</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proofFile">Attach Supporting Document</Label>
              <Input
                id="proofFile"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setProofFile(file);
                  console.log('Proof file selected:', file?.name || 'None');
                }}
                className="bg-background"
              />
              {proofFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>

          {/* Letter Preview */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Letter Preview</h3>
            </div>
            <Card className="bg-background">
              <CardContent className="p-6">
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed p-4 border rounded-lg bg-white"
                  style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt' }}
                >
                  {previewContent || 'Fill in the form to see preview...'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Letter...
                </>
              ) : (
                'Generate & Submit Letter'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ELetterGenerator;
