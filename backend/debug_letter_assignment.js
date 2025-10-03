#!/usr/bin/env node
/**
 * Debug letter assignment and approval authorization
 */

import mongoose from 'mongoose';
import Letter from './models/Letter.js';
import User from './models/User.js';

async function debugLetterAssignment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-document-approval');
    console.log('✅ Connected to MongoDB');

    // Get the specific letter ID from the error
    const letterId = '68c394d0a6557eb213aa938c';
    const facultyId = '68bcad16d585e1ac99bf822a';

    console.log('🔍 Debugging Letter Assignment...\n');

    // Find the letter
    const letter = await Letter.findById(letterId)
      .populate('submittedBy', 'name email role vtuId facultyId department')
      .populate('assignedMentor', 'name email designation role')
      .populate('assignedHOD', 'name email designation role')
      .populate('assignedDean', 'name email designation role')
      .populate('currentApprover', 'name email designation role');

    if (!letter) {
      console.log('❌ Letter not found');
      return;
    }

    console.log('📝 Letter Details:');
    console.log('  ID:', letter._id);
    console.log('  Title:', letter.title);
    console.log('  Status:', letter.status);
    console.log('  Workflow Step:', letter.workflowStep);
    console.log('  Submitted By:', letter.submittedBy?.name, `(${letter.submittedBy?._id})`);
    console.log('  Assigned Mentor:', letter.assignedMentor?.name, `(${letter.assignedMentor?._id})`);
    console.log('  Assigned HOD:', letter.assignedHOD?.name, `(${letter.assignedHOD?._id})`);
    console.log('  Assigned Dean:', letter.assignedDean?.name, `(${letter.assignedDean?._id})`);
    console.log('  Current Approver:', letter.currentApprover?.name, `(${letter.currentApprover?._id})`);

    // Find the faculty member
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      console.log('❌ Faculty not found');
      return;
    }

    console.log('\n👤 Faculty Details:');
    console.log('  ID:', faculty._id);
    console.log('  Name:', faculty.name);
    console.log('  Role:', faculty.role);
    console.log('  Faculty ID:', faculty.facultyId);
    console.log('  Designation:', faculty.designation);

    // Check authorization logic
    console.log('\n🔐 Authorization Check:');
    let canApprove = false;
    let reason = '';

    // Admin can always approve
    if (faculty.role === 'admin') {
      canApprove = true;
      reason = 'Admin role';
    }
    // Check workflow step and faculty assignment
    else if (letter.workflowStep === 'mentor' && letter.assignedMentor?.toString() === facultyId) {
      canApprove = true;
      reason = 'Mentor at mentor step';
    }
    else if (letter.workflowStep === 'hod' && letter.assignedHOD?.toString() === facultyId) {
      canApprove = true;
      reason = 'HOD at HOD step';
    }
    else if (letter.workflowStep === 'dean' && letter.assignedDean?.toString() === facultyId) {
      canApprove = true;
      reason = 'Dean at dean step';
    }
    // Check if faculty is the current approver (fallback)
    else if (letter.currentApprover?.toString() === facultyId) {
      canApprove = true;
      reason = 'Current approver';
    }
    else {
      reason = 'No matching authorization condition';
    }

    console.log('  Can Approve:', canApprove);
    console.log('  Reason:', reason);

    // Check specific conditions
    console.log('\n🔍 Detailed Checks:');
    console.log('  Faculty Role === admin:', faculty.role === 'admin');
    console.log('  Workflow Step === mentor:', letter.workflowStep === 'mentor');
    console.log('  Assigned Mentor ID === Faculty ID:', letter.assignedMentor?.toString() === facultyId);
    console.log('  Workflow Step === hod:', letter.workflowStep === 'hod');
    console.log('  Assigned HOD ID === Faculty ID:', letter.assignedHOD?.toString() === facultyId);
    console.log('  Workflow Step === dean:', letter.workflowStep === 'dean');
    console.log('  Assigned Dean ID === Faculty ID:', letter.assignedDean?.toString() === facultyId);
    console.log('  Current Approver ID === Faculty ID:', letter.currentApprover?.toString() === facultyId);

    // Check if letter is in pending status
    console.log('\n📊 Letter Status Check:');
    console.log('  Status === pending:', letter.status === 'pending');
    console.log('  Status:', letter.status);

    // Find all letters assigned to this faculty
    console.log('\n📋 All Letters Assigned to This Faculty:');
    const assignedLetters = await Letter.find({
      status: 'pending',
      $or: [
        { workflowStep: 'mentor', assignedMentor: facultyId },
        { workflowStep: 'hod', assignedHOD: facultyId },
        { workflowStep: 'dean', assignedDean: facultyId },
        { currentApprover: facultyId }
      ]
    })
      .select('title status workflowStep assignedMentor assignedHOD assignedDean currentApprover')
      .populate('assignedMentor', 'name')
      .populate('assignedHOD', 'name')
      .populate('assignedDean', 'name')
      .populate('currentApprover', 'name');

    console.log('  Total assigned letters:', assignedLetters.length);
    assignedLetters.forEach((l, index) => {
      console.log(`  ${index + 1}. ${l.title} (${l.status}) - ${l.workflowStep} step`);
      console.log(`     Mentor: ${l.assignedMentor?.name || 'None'}`);
      console.log(`     HOD: ${l.assignedHOD?.name || 'None'}`);
      console.log(`     Dean: ${l.assignedDean?.name || 'None'}`);
      console.log(`     Current: ${l.currentApprover?.name || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug
debugLetterAssignment().then(() => {
  console.log('\n🎯 Debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error);
});

