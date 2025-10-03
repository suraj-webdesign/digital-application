import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import FacultyProfile from './models/FacultyProfile.js';
import LetterTemplate from './models/LetterTemplate.js';
import Letter from './models/Letter.js';

async function resetDatabase() {
  try {
    await mongoose.connect('mongodb+srv://vtu24139_db_user:suraj123@cluster0.lggnsfa.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');

    // Clear all collections
    console.log('🧹 Clearing all collections...');
    await User.deleteMany({});
    await FacultyProfile.deleteMany({});
    await LetterTemplate.deleteMany({});
    await Letter.deleteMany({});
    console.log('✅ All collections cleared');

    // Create users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = await User.create([
      {
        name: 'Aman Kumar',
        email: 'aman@student.com',
        password: hashedPassword,
        role: 'student',
        vtuId: 'CS001',
        department: 'Computer Science',
        year: '3rd',
        semester: '6th',
        isActive: true
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah@faculty.com',
        password: hashedPassword,
        role: 'faculty',
        designation: 'Assistant Professor',
        department: 'Computer Science',
        specialization: 'Machine Learning',
        isActive: true
      },
      {
        name: 'Dr. Emily Rodriguez',
        email: 'emily@hod.com',
        password: hashedPassword,
        role: 'hod',
        designation: 'Head of Department',
        department: 'Computer Science',
        specialization: 'Data Science',
        isActive: true
      },
      {
        name: 'Dr. Robert Singh',
        email: 'robert@principal.com',
        password: hashedPassword,
        role: 'principal',
        designation: 'Principal',
        department: 'Administration',
        isActive: true
      },
      {
        name: 'System Administrator',
        email: 'admin@system.com',
        password: hashedPassword,
        role: 'admin',
        designation: 'System Admin',
        department: 'IT',
        isActive: true
      }
    ]);

    console.log('✅ Users created:', users.length);

    // Create faculty profiles
    console.log('👨‍🏫 Creating faculty profiles...');
    const facultyProfiles = await FacultyProfile.create([
      {
        facultyId: users[1]._id, // Dr. Sarah Johnson
        designation: 'Assistant Professor',
        department: 'Computer Science',
        phone: '+91-9876543210',
        officeLocation: 'Faculty Quarters, Veltech University'
      },
      {
        facultyId: users[2]._id, // Dr. Emily Rodriguez
        designation: 'Head of Department',
        department: 'Computer Science',
        phone: '+91-9876543211',
        officeLocation: 'HOD Office, Veltech University'
      },
      {
        facultyId: users[3]._id, // Dr. Robert Singh
        designation: 'Principal',
        department: 'Administration',
        phone: '+91-9876543212',
        officeLocation: 'Principal Office, Veltech University'
      }
    ]);

    console.log('✅ Faculty profiles created:', facultyProfiles.length);

    // Create letter templates
    console.log('📄 Creating letter templates...');
    const letterTemplates = await LetterTemplate.create([
      {
        name: 'Leave Application',
        category: 'application',
        template: 'Respected Sir/Madam,\n\nI am writing to request leave from [start_date] to [end_date] for [reason].\n\nI will ensure that my academic responsibilities are not affected during this period.\n\nThank you for your consideration.\n\nYours sincerely,\n[student_name]',
        fields: [
          { name: 'start_date', label: 'Start Date', type: 'date', required: true, placeholder: 'Select start date' },
          { name: 'end_date', label: 'End Date', type: 'date', required: true, placeholder: 'Select end date' },
          { name: 'reason', label: 'Reason for Leave', type: 'text', required: true, placeholder: 'Enter reason for leave' }
        ],
        isActive: true,
        createdBy: users[4]._id // Admin user
      },
      {
        name: 'Internship Request',
        category: 'request',
        template: 'Respected Sir/Madam,\n\nI am writing to request permission for an internship at [company_name] from [start_date] to [end_date].\n\nThis internship will help me gain practical experience in [field] and enhance my learning.\n\nI will ensure that all academic requirements are completed before the internship period.\n\nThank you for your consideration.\n\nYours sincerely,\n[student_name]',
        fields: [
          { name: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'Enter company name' },
          { name: 'start_date', label: 'Start Date', type: 'date', required: true, placeholder: 'Select start date' },
          { name: 'end_date', label: 'End Date', type: 'date', required: true, placeholder: 'Select end date' },
          { name: 'field', label: 'Field of Internship', type: 'text', required: true, placeholder: 'Enter field of internship' }
        ],
        isActive: true,
        createdBy: users[4]._id // Admin user
      }
    ]);

    console.log('✅ Letter templates created:', letterTemplates.length);

    // Create sample letters
    console.log('📝 Creating sample letters...');
    const sampleLetters = await Letter.create([
      {
        title: 'Leave Application - Medical Emergency',
        content: 'Respected Sir/Madam,\n\nI am writing to request leave from 2025-09-15 to 2025-09-20 for a medical emergency in my family.\n\nI will ensure that my academic responsibilities are not affected during this period and will catch up on any missed work.\n\nThank you for your consideration.\n\nYours sincerely,\nAman Kumar',
        submittedBy: users[0]._id,
        templateId: letterTemplates[0]._id,
        status: 'pending',
        workflowStep: 'mentor',
        assignedMentor: users[1]._id,
        currentApprover: users[1]._id
      },
      {
        title: 'Internship Request - Tech Company',
        content: 'Respected Sir/Madam,\n\nI am writing to request permission for an internship at TechCorp Solutions from 2025-10-01 to 2025-12-31.\n\nThis internship will help me gain practical experience in software development and enhance my learning in the field of computer science.\n\nI will ensure that all academic requirements are completed before the internship period.\n\nThank you for your consideration.\n\nYours sincerely,\nAman Kumar',
        submittedBy: users[0]._id,
        templateId: letterTemplates[1]._id,
        status: 'pending',
        workflowStep: 'mentor',
        assignedMentor: users[1]._id,
        currentApprover: users[1]._id
      },
      {
        title: 'Leave Application - Family Function',
        content: 'Respected Sir/Madam,\n\nI am writing to request leave from 2025-09-25 to 2025-09-27 for a family function.\n\nI will ensure that my academic responsibilities are not affected during this period.\n\nThank you for your consideration.\n\nYours sincerely,\nAman Kumar',
        submittedBy: users[0]._id,
        templateId: letterTemplates[0]._id,
        status: 'pending',
        workflowStep: 'mentor',
        assignedMentor: users[1]._id,
        currentApprover: users[1]._id
      },
      {
        title: 'Internship Request - Research Lab',
        content: 'Respected Sir/Madam,\n\nI am writing to request permission for an internship at AI Research Lab from 2025-11-01 to 2026-01-31.\n\nThis internship will help me gain practical experience in artificial intelligence and machine learning.\n\nI will ensure that all academic requirements are completed before the internship period.\n\nThank you for your consideration.\n\nYours sincerely,\nAman Kumar',
        submittedBy: users[0]._id,
        templateId: letterTemplates[1]._id,
        status: 'pending',
        workflowStep: 'mentor',
        assignedMentor: users[1]._id,
        currentApprover: users[1]._id
      },
      {
        title: 'Leave Application - Personal Work',
        content: 'Respected Sir/Madam,\n\nI am writing to request leave from 2025-09-30 to 2025-10-02 for personal work.\n\nI will ensure that my academic responsibilities are not affected during this period.\n\nThank you for your consideration.\n\nYours sincerely,\nAman Kumar',
        submittedBy: users[0]._id,
        templateId: letterTemplates[0]._id,
        status: 'pending',
        workflowStep: 'mentor',
        assignedMentor: users[1]._id,
        currentApprover: users[1]._id
      }
    ]);

    console.log('✅ Sample letters created:', sampleLetters.length);

    console.log('\n🎉 Database reset completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`👨‍🏫 Faculty Profiles: ${facultyProfiles.length}`);
    console.log(`📄 Letter Templates: ${letterTemplates.length}`);
    console.log(`📝 Sample Letters: ${sampleLetters.length}`);

    console.log('\n🔑 Login Credentials:');
    console.log('Student: aman@student.com / password123');
    console.log('Faculty: sarah@faculty.com / password123');
    console.log('HOD: emily@hod.com / password123');
    console.log('Principal: robert@principal.com / password123');
    console.log('Admin: admin@system.com / password123');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB Disconnected');
  }
}

resetDatabase();
