import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';
import { User, Mail, Phone, MapPin, GraduationCap, Save, X, Edit3 } from 'lucide-react';

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    department: '',
    studentId: '',
    year: '',
    semester: '',
    designation: '',
    specialization: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        department: user.department || '',
        studentId: user.studentId || '',
        year: user.year || '',
        semester: user.semester || '',
        designation: user.designation || '',
        specialization: user.specialization || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 ProfileEditor: Updating field "${field}" with value "${value}"`);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      console.log(`📝 ProfileEditor: Updated form data:`, updated);
      return updated;
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      console.log('📤 ProfileEditor: Sending profile data:', formData);
      const response = await ApiService.updateProfile(formData);
      console.log('📥 ProfileEditor: Received response:', response);
      
      if (response.success) {
        updateUser(response.data.user);
        toast({
          title: "Profile updated successfully!",
          description: "Your profile information has been saved.",
        });
        setIsEditing(false);
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ ProfileEditor: Profile update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        department: user.department || '',
        studentId: user.studentId || '',
        year: user.year || '',
        semester: user.semester || '',
        designation: user.designation || '',
        specialization: user.specialization || ''
      });
    }
    setIsEditing(false);
  };

  const isStudent = user?.role === 'student';
  const isFaculty = user?.role === 'faculty';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-veltech-gradient rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Edit Profile</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Academic Information</span>
              </CardTitle>
              <CardDescription>
                {isStudent ? 'Your academic details' : 'Your professional details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  {isEditing ? (
                    <Select
                      value={formData.department}
                      onValueChange={(value) => handleInputChange('department', value)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formData.department || "Select department"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science Engineering">Computer Science Engineering</SelectItem>
                        <SelectItem value="Electronics and Communication Engineering">Electronics and Communication Engineering</SelectItem>
                        <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                        <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                        <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                        <SelectItem value="Information Technology">Information Technology</SelectItem>
                        <SelectItem value="Aerospace Engineering">Aerospace Engineering</SelectItem>
                        <SelectItem value="Biotechnology">Biotechnology</SelectItem>
                        <SelectItem value="Chemical Engineering">Chemical Engineering</SelectItem>
                        <SelectItem value="Automobile Engineering">Automobile Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                      <span className="text-muted-foreground">{formData.department || 'No department selected'}</span>
                    </div>
                  )}
                </div>

                {isStudent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        value={formData.studentId}
                        onChange={(e) => handleInputChange('studentId', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">Academic Year</Label>
                      {isEditing ? (
                        <Select
                          value={formData.year}
                          onValueChange={(value) => handleInputChange('year', value)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {formData.year || "Select year"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Year">1st Year</SelectItem>
                            <SelectItem value="2nd Year">2nd Year</SelectItem>
                            <SelectItem value="3rd Year">3rd Year</SelectItem>
                            <SelectItem value="4th Year">4th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                          <span className="text-muted-foreground">{formData.year || 'No year selected'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester</Label>
                      {isEditing ? (
                        <Select
                          value={formData.semester}
                          onValueChange={(value) => handleInputChange('semester', value)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {formData.semester || "Select semester"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Semester">1st Semester</SelectItem>
                            <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                            <SelectItem value="3rd Semester">3rd Semester</SelectItem>
                            <SelectItem value="4th Semester">4th Semester</SelectItem>
                            <SelectItem value="5th Semester">5th Semester</SelectItem>
                            <SelectItem value="6th Semester">6th Semester</SelectItem>
                            <SelectItem value="7th Semester">7th Semester</SelectItem>
                            <SelectItem value="8th Semester">8th Semester</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                          <span className="text-muted-foreground">{formData.semester || 'No semester selected'}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {isFaculty && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      {isEditing ? (
                        <Select
                          value={formData.designation}
                          onValueChange={(value) => handleInputChange('designation', value)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {formData.designation || "Select designation"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Professor">Professor</SelectItem>
                            <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                            <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                            <SelectItem value="Lecturer">Lecturer</SelectItem>
                            <SelectItem value="HOD">Head of Department</SelectItem>
                            <SelectItem value="Dean">Dean</SelectItem>
                            <SelectItem value="Mentor">Mentor</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                          <span className="text-muted-foreground">{formData.designation || 'No designation selected'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        value={formData.specialization}
                        onChange={(e) => handleInputChange('specialization', e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., Computer Science, Electronics"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center space-x-2 btn-veltech"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
