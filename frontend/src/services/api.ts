const API_BASE_URL = `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5000'}/api`;

// API Service for Digital Document Approval System
export class ApiService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Authentication
  static async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      // Always return the data, whether success or failure
      // The frontend will check data.success to determine if login was successful
      return data;
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'faculty';
    vtuId?: string;
    facultyId?: string;
    designation?: string;
    department?: string;
    phone?: string;
    address?: string;
    year?: string;
    semester?: string;
    specialization?: string;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  static async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user');
    }
    
    return data;
  }

  static async logout() {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Logout failed');
    }
    
    return data;
  }

  static async updateProfile(profileData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    department?: string;
    studentId?: string;
    year?: string;
    semester?: string;
    designation?: string;
    specialization?: string;
  }) {
    try {
      console.log('📤 API Service: Updating profile with data:', profileData);
      console.log('📤 API Service: Using URL:', `${API_BASE_URL}/users/profile`);
      console.log('📤 API Service: Auth headers:', this.getAuthHeaders());
      
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      
      console.log('📥 API Service: Response status:', response.status);
      console.log('📥 API Service: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('📥 API Service: Error data:', errorData);
        throw new Error(errorData.message || 'Profile update failed');
      }
      
      const result = await response.json();
      console.log('📥 API Service: Success result:', result);
      return result;
    } catch (error) {
      console.error('❌ API Service: Profile update error:', error);
      throw error;
    }
  }

  static async forgotPassword(email: string) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset email');
    }
    
    return data;
  }

  static async resetPassword(token: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }
    
    return data;
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to change password');
    }
    
    return data;
  }

  // Documents
  static async uploadDocument(formData: FormData) {
    const token = localStorage.getItem('token');
    console.log('📤 Uploading document with token:', token ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });
    
    console.log('📥 Upload response status:', response.status);
    console.log('📥 Upload response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Document upload failed';
      try {
        const errorData = await response.json();
        console.log('📥 Upload error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 Could not parse error response');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 Upload success data:', result);
    return result;
  }

  static async getDocuments(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${API_BASE_URL}/documents?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    
    return response.json();
  }

  static async getUserDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents/my`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user documents');
    }
    
    return response.json();
  }

  static async getFacultyByDepartment(department: string, designation?: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('department', department);
    if (designation) {
      queryParams.append('designation', designation);
    }

    const response = await fetch(`${API_BASE_URL}/users/faculty-by-department?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch faculty members');
    }
    
    return response.json();
  }

  static async getAssignedDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents/assigned`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch assigned documents');
    }
    
    return response.json();
  }

  // Letter Templates (Public - no auth required)
  static async getLetterTemplates(category?: string) {
    const queryParams = category ? `?category=${category}` : '';
    const response = await fetch(`${API_BASE_URL}/letters/templates${queryParams}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch letter templates');
    }
    
    return response.json();
  }

  static async getLetterTemplate(id: string) {
    const response = await fetch(`${API_BASE_URL}/letters/templates/${id}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch letter template');
    }
    
    return response.json();
  }

  // Letters
  static async generateLetter(letterData: FormData) {
    console.log('📤 API Service: Generating letter with FormData');
    console.log('📤 API Service: Using URL:', `${API_BASE_URL}/letters/generate`);
    
    // Get auth headers but remove Content-Type to let browser set it for FormData
    const authHeaders = this.getAuthHeaders();
    const { 'Content-Type': _, ...headersWithoutContentType } = authHeaders;
    
    const response = await fetch(`${API_BASE_URL}/letters/generate`, {
      method: 'POST',
      headers: headersWithoutContentType,
      body: letterData
    });
    
    console.log('📥 API Service: Response status:', response.status);
    console.log('📥 API Service: Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Failed to generate letter';
      let errorData = null;
      try {
        errorData = await response.json();
        console.log('📥 API Service: Error data:', errorData);
        console.log('📥 API Service: Response status:', response.status);
        console.log('📥 API Service: Response statusText:', response.statusText);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse error response');
        console.log('📥 API Service: Raw response text:', await response.text());
      }
      console.log('📥 API Service: Final error message:', errorMessage);
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 API Service: Success result:', result);
    return result;
  }

  static async getUserLetters() {
    const response = await fetch(`${API_BASE_URL}/letters/my`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user letters');
    }
    
    return response.json();
  }

  static async getAssignedLetters() {
    try {
      const response = await fetch(`${API_BASE_URL}/letters/assigned`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      // Always return the data, whether success or failure
      // The frontend will check data.success to determine if request was successful
      return data;

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  static async approveLetter(id: string, comment?: string) {
    console.log('📤 API Service: Approving letter:', id);
    console.log('📤 API Service: Comment:', comment);
    console.log('📤 API Service: Auth headers:', this.getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/letters/${id}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ comment })
    });
    
    console.log('📥 API Service: Approve response status:', response.status);
    console.log('📥 API Service: Approve response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Failed to approve letter';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Approve error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse error response');
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  static async rejectLetter(id: string, reason: string) {
    const response = await fetch(`${API_BASE_URL}/letters/${id}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject letter');
    }
    
    return response.json();
  }

  static async signLetter(id: string, signatureData: any) {
    console.log('📤 API Service: Signing letter with ID:', id);
    console.log('📤 API Service: Signature data:', signatureData);
    
    const response = await fetch(`${API_BASE_URL}/letters/${id}/sign`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ signatureData })
    });
    
    console.log('📥 API Service: Sign letter response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to sign letter';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Sign letter error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse sign letter error response');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 API Service: Sign letter success result:', result);
    return result;
  }

  static async sendReminder(letterId: string, message?: string) {
    console.log('📤 API Service: Sending reminder for letter ID:', letterId);
    
    const response = await fetch(`${API_BASE_URL}/letters/${letterId}/reminder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ message })
    });
    
    console.log('📥 API Service: Reminder response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to send reminder';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Reminder error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse reminder error response');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 API Service: Reminder success result:', result);
    return result;
  }

  static async downloadLetter(id: string): Promise<Blob> {
    console.log('📤 API Service: Downloading letter with ID:', id);
    console.log('📤 API Service: Using URL:', `${API_BASE_URL}/letters/${id}/download`);
    
    const response = await fetch(`${API_BASE_URL}/letters/${id}/download`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Download letter response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to download letter';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Download letter error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse download letter error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Download letter blob size:', blob.size, 'bytes');
    return blob;
  }

  static async getDocumentById(id: string) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }
    
    return response.json();
  }

  static async downloadDocument(id: string): Promise<Blob> {
    console.log('📤 API Service: Downloading document with ID:', id);
    console.log('📤 API Service: Using URL:', `${API_BASE_URL}/documents/${id}/download`);
    console.log('📤 API Service: Auth headers:', this.getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Download response status:', response.status);
    console.log('📥 API Service: Download response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Failed to download document';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Download error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse download error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Download blob size:', blob.size, 'bytes');
    console.log('📥 API Service: Download blob type:', blob.type);
    return blob;
  }

  static async downloadSignedDocument(id: string): Promise<Blob> {
    console.log('📤 API Service: Downloading signed document with ID:', id);
    console.log('📤 API Service: Using URL:', `${API_BASE_URL}/documents/${id}/download-signed`);
    console.log('📤 API Service: Auth headers:', this.getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/documents/${id}/download-signed`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Signed download response status:', response.status);
    console.log('📥 API Service: Signed download response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Failed to download signed document';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Signed download error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse signed download error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Signed download blob size:', blob.size, 'bytes');
    console.log('📥 API Service: Signed download blob type:', blob.type);
    return blob;
  }

  static async downloadCleanLetter(letterId: string): Promise<Blob> {
    console.log('📤 API Service: Downloading clean letter with ID:', letterId);
    console.log('📤 API Service: Using URL:', `${API_BASE_URL}/letters/${letterId}/download-clean`);
    
    const response = await fetch(`${API_BASE_URL}/letters/${letterId}/download-clean`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Clean download response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to download clean letter';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Clean download error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse clean download error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Clean download blob size:', blob.size, 'bytes');
    console.log('📥 API Service: Clean download blob type:', blob.type);
    return blob;
  }

  static async downloadSignedLetter(letterId: string): Promise<Blob> {
    console.log('📤 API Service: Downloading signed letter with ID:', letterId);
    console.log('📤 API Service: Using URL:', `${API_BASE_URL}/letters/${letterId}/download-signed`);
    
    const response = await fetch(`${API_BASE_URL}/letters/${letterId}/download-signed`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Signed letter download response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to download signed letter';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Signed letter download error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse signed letter download error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Signed letter download blob size:', blob.size, 'bytes');
    console.log('📥 API Service: Signed letter download blob type:', blob.type);
    return blob;
  }


  static async signDocument(id: string, signatureData: any) {
    console.log('📤 API Service: Signing document with ID:', id);
    console.log('📤 API Service: Signature data:', signatureData);
    
    const response = await fetch(`${API_BASE_URL}/documents/${id}/sign`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ signatureData })
    });
    
    console.log('📥 API Service: Sign response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to sign document';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Sign error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse sign error response');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 API Service: Sign success result:', result);
    return result;
  }

  static async getSignedDocument(id: string) {
    console.log('📤 API Service: Getting signed document with ID:', id);
    
    const response = await fetch(`${API_BASE_URL}/documents/${id}/signed`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Get signed response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to get signed document';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Get signed error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse get signed error response');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 API Service: Get signed success result:', result);
    return result;
  }

  static async approveDocument(id: string) {
    console.log('📤 API Service: Approving document with ID:', id);
    
    const response = await fetch(`${API_BASE_URL}/documents/${id}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Approve response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to approve document';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Approve error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse approve error response');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 API Service: Approve success result:', result);
    return result;
  }

  // Approvals
  static async getPendingDocuments(params?: {
    page?: number;
    limit?: number;
    priority?: string;
    documentType?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.documentType) queryParams.append('documentType', params.documentType);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${API_BASE_URL}/approvals/pending?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch pending documents');
    }
    
    return response.json();
  }


  static async rejectDocument(id: string, reason: string, comment?: string) {
    const response = await fetch(`${API_BASE_URL}/approvals/${id}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason, comment })
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject document');
    }
    
    return response.json();
  }

  static async getApprovalStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/stats`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      // Always return the data, whether success or failure
      // The frontend will check data.success to determine if request was successful
      return data;

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  // Signatures
  static async uploadSignature(signature: string) {
    const response = await fetch(`${API_BASE_URL}/signatures/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ signature })
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload signature');
    }
    
    return response.json();
  }

  static async getSignatureFromProfile(userId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/signatures/profile/${userId}`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      // Always return the data, whether success or failure
      return data;

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  static async getFacultyApprovalHistory(facultyId?: string, options: any = {}) {
    try {
      const { status, limit = 50, skip = 0, sortBy = 'approved_at', sortOrder = 'desc' } = options;
      
      const url = facultyId 
        ? `${API_BASE_URL}/letters/approval-history/${facultyId}`
        : `${API_BASE_URL}/letters/approval-history`;
      
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit.toString());
      if (skip) params.append('skip', skip.toString());
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      
      const response = await fetch(fullUrl, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch approval history');
      }

      return data;

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  static async getDocumentApprovalHistory(documentId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/letters/${documentId}/approval-history`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch document approval history');
      }

      return data;

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  static async getSignatureStatus() {
    const response = await fetch(`${API_BASE_URL}/signatures/status`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to get signature status');
    }
    
    return response.json();
  }

  static async removeSignature() {
    const response = await fetch(`${API_BASE_URL}/signatures/remove`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove signature');
    }
    
    return response.json();
  }

  // Users
  static async getFacultyList() {
    const response = await fetch(`${API_BASE_URL}/users/faculty/list`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch faculty list');
    }
    
    return response.json();
  }


  // Analytics
  static async getDashboardAnalytics() {
    const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch dashboard analytics');
    }
    
    return data;
  }

  // Admin-specific methods
  static async getAllUsers() {
    const response = await fetch(`${API_BASE_URL}/users/all`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    // Always return the data, whether success or failure
    // The frontend will check data.success to determine if the request was successful
    return data;
  }

  static async getAllDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents/all`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    // Always return the data, whether success or failure
    // The frontend will check data.success to determine if the request was successful
    return data;
  }

  static async getSystemStats() {
    const response = await fetch(`${API_BASE_URL}/analytics/system-stats`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch system stats');
    }
    
    return data;
  }

  static async updateUserStatus(userId: string, isActive: boolean) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isActive })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user status');
    }
    
    return data;
  }

  static async updateUserRole(userId: string, role: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user role');
    }
    
    return data;
  }

  static async updateUser(userId: string, userData: any) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user');
    }
    
    return data;
  }

  static async deleteUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete user');
    }
    
    return data;
  }

  // PDF Generation methods
  static async generateLetterPDF(letterId: string, type: 'clean' | 'signed' = 'clean') {
    console.log('📤 API Service: Generating PDF for letter:', letterId, 'Type:', type);
    
    const response = await fetch(`${API_BASE_URL}/letters/${letterId}/generate-pdf`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type })
    });
    
    console.log('📥 API Service: PDF generation response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to generate PDF';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: PDF generation error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse PDF generation error response');
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('📥 API Service: PDF generation response data:', data);
    return data.data;
  }

  static async downloadCleanPDF(letterId: string): Promise<Blob> {
    console.log('📤 API Service: Downloading clean PDF for letter:', letterId);
    
    const response = await fetch(`${API_BASE_URL}/letters/${letterId}/download-clean-pdf`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Clean PDF download response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to download clean PDF';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Clean PDF download error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse clean PDF download error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Clean PDF download blob size:', blob.size, 'bytes');
    console.log('📥 API Service: Clean PDF download blob type:', blob.type);
    return blob;
  }

  static async downloadSignedPDF(letterId: string): Promise<Blob> {
    console.log('📤 API Service: Downloading signed PDF for letter:', letterId);
    
    const response = await fetch(`${API_BASE_URL}/letters/${letterId}/download-signed-pdf`, {
      headers: this.getAuthHeaders()
    });
    
    console.log('📥 API Service: Signed PDF download response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to download signed PDF';
      try {
        const errorData = await response.json();
        console.log('📥 API Service: Signed PDF download error data:', errorData);
        errorMessage = errorData.message || errorData.errors || errorMessage;
      } catch (e) {
        console.log('📥 API Service: Could not parse signed PDF download error response');
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    console.log('📥 API Service: Signed PDF download blob size:', blob.size, 'bytes');
    console.log('📥 API Service: Signed PDF download blob type:', blob.type);
    return blob;
  }

  // Utility methods
  static isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  static getToken() {
    return localStorage.getItem('token');
  }
}

export default ApiService;
