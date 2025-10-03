import { createCanvas } from 'canvas';

// Function to generate handwritten-style signature from faculty name
export const generateHandwrittenSignature = (facultyName, facultyDesignation) => {
  try {
    // Create a canvas for the signature (larger for better readability)
    const canvas = createCanvas(300, 100);
    const ctx = canvas.getContext('2d');
    
    // Set background to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set font style for handwritten look - larger and more elegant
    ctx.font = 'italic 28px "Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive, serif';
    ctx.fillStyle = '#1a365d'; // Darker blue for better contrast
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Add subtle randomness to make it look more handwritten
    const randomOffset = () => (Math.random() - 0.5) * 3;
    
    // Draw the faculty name with slight variations
    const nameWords = facultyName.split(' ');
    let currentX = 20;
    const baseY = 40;
    
    nameWords.forEach((word, index) => {
      // Add slight random offset to each word
      const x = currentX + randomOffset();
      const y = baseY + randomOffset();
      
      ctx.fillText(word, x, y);
      
      // Move to next word position
      currentX += ctx.measureText(word).width + 15;
    });
    
    // Add designation below the name in smaller font
    ctx.font = 'italic 16px "Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive, serif';
    ctx.fillStyle = '#4a5568';
    ctx.fillText(facultyDesignation, 20 + randomOffset(), 70 + randomOffset());
    
    // Convert canvas to base64 data URL
    const dataURL = canvas.toDataURL('image/png');
    
    return dataURL;
  } catch (error) {
    console.error('Error generating handwritten signature:', error);
    // Fallback: return a simple text-based signature
    return generateTextSignature(facultyName, facultyDesignation);
  }
};

// Fallback function for text-based signature
const generateTextSignature = (facultyName, facultyDesignation) => {
  const canvas = createCanvas(300, 100);
  const ctx = canvas.getContext('2d');
  
  // Set background to transparent
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set font for professional look - larger
  ctx.font = 'italic 24px "Times New Roman", serif';
  ctx.fillStyle = '#1a365d';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // Draw name
  ctx.fillText(facultyName, 20, 40);
  
  // Draw designation
  ctx.font = 'italic 16px "Times New Roman", serif';
  ctx.fillStyle = '#4a5568';
  ctx.fillText(facultyDesignation, 20, 70);
  
  return canvas.toDataURL('image/png');
};

// Function to create a signature HTML element
export const createSignatureHTML = (facultyName, facultyDesignation, signatureImage = null) => {
  // If signature image is provided, use it directly; otherwise generate one
  const signature = signatureImage || generateHandwrittenSignature(facultyName, facultyDesignation);
  
  return `
    <div class="signature-block">
      <div class="signature-image-container">
        <img src="${signature}" alt="Digital Signature" class="signature-image" />
      </div>
      <div class="signature-details">
        <div class="signature-name">${facultyName}</div>
        <div class="signature-role">${facultyDesignation}</div>
        <div class="signature-date">${new Date().toLocaleDateString()}</div>
      </div>
    </div>
  `;
};
