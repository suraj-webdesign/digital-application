const mongoose = require('mongoose');

async function updateLetters() {
  try {
    await mongoose.connect('mongodb://localhost:27017/digital-document-approval');
    console.log('Connected to database');
    
    const letters = await mongoose.connection.db.collection('letters').find({}).toArray();
    console.log('Found letters:', letters.length);
    
    for (const letter of letters) {
      if (letter.submittedBy && !letter.studentId) {
        console.log('Updating letter:', letter._id, 'with studentId:', letter.submittedBy);
        await mongoose.connection.db.collection('letters').updateOne(
          { _id: letter._id },
          { $set: { studentId: letter.submittedBy } }
        );
      }
    }
    
    console.log('All letters updated with studentId');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

updateLetters();
