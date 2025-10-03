#!/usr/bin/env python3
"""
Robust Letter PDF Generator
Handles all edge cases and ensures reliable PDF generation
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch
from reportlab.lib.colors import black
from datetime import datetime, date
import os
import base64
import io
from PIL import Image as PILImage
import tempfile
import re
import html
import json

# Register a cursive-like font for signatures
# (You can add BrushScriptStd.ttf or another cursive font file to your project)
try:
    pdfmetrics.registerFont(TTFont("Cursive", "BrushScriptStd.ttf"))
    CURSIVE_FONT = "Cursive"
except:
    CURSIVE_FONT = "Times-Italic"  # fallback if cursive font not available

def generate_letter_pdf(letter_text, signers, output_file):
    """
    Generate an approved letter as a clean A4 PDF using ReportLab.
    
    Args:
        letter_text (str): exact text submitted by the student
        signers (list): list of signers with signature data
        output_file (str): path to save PDF
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from datetime import date
    import os

        c = canvas.Canvas(output_file, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 50, "Veltech University")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, "Department of Computer Science")
    c.drawString(50, height - 90, "Chennai, Tamil Nadu")
    c.drawString(50, height - 110, date.today().strftime("%B %d, %Y"))

    # Letter Body (student's exact submission)
    text_obj = c.beginText(50, height - 150)
    text_obj.setFont("Helvetica", 12)
    for line in letter_text.split("\n"):
        text_obj.textLine(line.strip())
    c.drawText(text_obj)

    # Signature Row
    y = 100
    block_width = 150
    spacing = 60
    total_width = len(signers) * block_width + (len(signers) - 1) * spacing
    start_x = (width - total_width) / 2

    for idx, s in enumerate(signers):
        x = start_x + idx * (block_width + spacing)
        if s.get("signatureImagePath") and os.path.exists(s["signatureImagePath"]):
            c.drawImage(s["signatureImagePath"], x, y, width=120, height=50, mask='auto')
        else:
            c.setFont("Times-Italic", 20)
            c.drawString(x, y + 20, s["name"])
        c.setFont("Helvetica", 10)
        c.drawString(x, y - 10, s["name"])
        c.drawString(x, y - 25, s["role"])
        c.drawString(x, y - 40, f"Date: {s['date']}")

        c.save()
        
    # Return success result
            return {
                'success': True,
                'output_path': output_file,
        'file_size': os.path.getsize(output_file) if os.path.exists(output_file) else 0,
        'message': 'PDF generated successfully with clean ReportLab'
    }

def process_signature_image(signature_data):
    """Process base64 signature image data"""
    try:
        # Handle base64 data
        if signature_data.startswith('data:image'):
            signature_data = signature_data.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(signature_data)
        
        # Create PIL Image
        image = PILImage.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        image.save(temp_file.name, 'PNG')
        temp_file.close()
        
        return temp_file.name
        
    except Exception as e:
        print(f"Error processing signature image: {e}")
        return None

if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python robust_letter_generator.py <json_data>")
        sys.exit(1)
    
    try:
        # Parse JSON data from command line argument
        data = json.loads(sys.argv[1])
        
        letter_text = data.get('letter_text', '')
        signers = data.get('signers', [])
        output_path = data.get('output_path', 'robust_letter.pdf')
        
        # Generate PDF
        result = generate_letter_pdf(letter_text, signers, output_path)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'message': f'Script execution failed: {str(e)}'
        }
        print(json.dumps(error_result))
