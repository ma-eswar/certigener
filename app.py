import os
import zipfile
import pandas as pd
from flask import Flask, render_template, request, send_file, jsonify
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(f"{UPLOAD_FOLDER}/fonts", exist_ok=True)
os.makedirs(f"{UPLOAD_FOLDER}/templates", exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

# 1. Upload Template
@app.route('/upload-template', methods=['POST'])
def upload_template():
    file = request.files['file']
    path = os.path.join(UPLOAD_FOLDER, 'templates', 'template.png')
    file.save(path)
    return jsonify({"status": "success", "path": path})

# 2. Upload Custom Font
@app.route('/upload-font', methods=['POST'])
def upload_font():
    file = request.files['file']
    filename = file.filename
    path = os.path.join(UPLOAD_FOLDER, 'fonts', filename)
    file.save(path)
    return jsonify({"status": "success", "fontName": filename})

# 3. Parse Excel Headers
@app.route('/parse-excel', methods=['POST'])
def parse_excel():
    file = request.files['file']
    df = pd.read_excel(file) if file.filename.endswith('.xlsx') else pd.read_csv(file)
    headers = df.columns.tolist()
    # Save temp CSV for generation step
    df.to_csv(os.path.join(UPLOAD_FOLDER, 'data.csv'), index=False)
    return jsonify({"headers": headers})

# 4. Generate Certificates
@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    placeholders = data['placeholders'] # List of config objects
    
    # Load Resources
    template_path = os.path.join(UPLOAD_FOLDER, 'templates', 'template.png')
    df = pd.read_csv(os.path.join(UPLOAD_FOLDER, 'data.csv'))
    
    generated_files = []
    
    # Loop through Excel Rows
    for index, row in df.iterrows():
        img = Image.open(template_path).convert("RGB")
        draw = ImageDraw.Draw(img)
        
        for p in placeholders:
            text = str(row.get(p['mapping'], ""))
            
            # Load Font (Default or Custom)
            font_path = os.path.join(UPLOAD_FOLDER, 'fonts', p['style'].get('fontFile', 'arial.ttf'))
            if not os.path.exists(font_path):
                # Fallback if font missing
                font = ImageFont.load_default()
            else:
                font_size = int(p['style']['fontSize'])
                font = ImageFont.truetype(font_path, font_size)

            # --- LOGIC: Auto-Scale or Center ---
            # Simplified Logic for MVP: Center Alignment
            
            # Calculate Text Size using getbbox (left, top, right, bottom)
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Center Logic
            box_x = p['rect']['x']
            box_w = p['rect']['w']
            box_y = p['rect']['y']
            
            # Calculate Center X
            draw_x = box_x + (box_w - text_width) / 2
            draw_y = box_y  # Rough Y alignment
            
            # Color Hex to RGB
            hex_color = p['style']['fontColor'].lstrip('#')
            rgb_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            
            draw.text((draw_x, draw_y), text, font=font, fill=rgb_color)
        
        # Save individual cert
        out_name = f"cert_{index}.jpg"
        out_path = os.path.join(OUTPUT_FOLDER, out_name)
        img.save(out_path)
        generated_files.append(out_path)

    # Zip Files
    zip_path = os.path.join(OUTPUT_FOLDER, 'certificates.zip')
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in generated_files:
            zipf.write(file, os.path.basename(file))
            os.remove(file) # Clean up image after zipping
            
    return jsonify({"download_url": "/download-zip"})

@app.route('/download-zip')
def download_zip():
    return send_file(os.path.join(OUTPUT_FOLDER, 'certificates.zip'), as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))