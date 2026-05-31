import os
import zipfile
import io
import time
import glob
import pandas as pd
from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def cleanup_old_files():
    """Deletes files older than 1 hour to keep Render server memory/disk clean"""
    current_time = time.time()
    for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER]:
        for file_path in glob.glob(os.path.join(folder, '*')):
            if os.path.isfile(file_path):
                if current_time - os.path.getctime(file_path) > 3600: # 1 hour
                    try:
                        os.remove(file_path)
                    except:
                        pass

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download-samples')
def download_samples():
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        fallback_data = "Name,Course,Date\nAditya Varma,UI/UX Design,12-Aug-2026\nJane Doe,Data Science,14-Aug-2026"
        zf.writestr('test_data.csv', fallback_data)
            
        img = Image.new('RGB', (1000, 700), color=(250, 250, 252))
        draw = ImageDraw.Draw(img)
        draw.rectangle([20, 20, 980, 680], outline="#cccccc", width=2) 
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG', quality=85)
        zf.writestr('sample_template.jpg', img_byte_arr.getvalue())

    memory_file.seek(0)
    return send_file(memory_file, download_name='CertiGener_Samples.zip', as_attachment=True)

@app.route('/upload-template', methods=['POST'])
def upload_template():
    cleanup_old_files() # Clean server on new activity
    file = request.files['file']
    session_id = request.form['session_id']
    path = os.path.join(UPLOAD_FOLDER, f'{session_id}_template.png')
    file.save(path)
    return jsonify({"status": "success"})

@app.route('/upload-font', methods=['POST'])
def upload_font():
    file = request.files['file']
    session_id = request.form['session_id']
    filename = file.filename
    path = os.path.join(UPLOAD_FOLDER, f'{session_id}_{filename}')
    file.save(path)
    return jsonify({"status": "success"})

@app.route('/parse-excel', methods=['POST'])
def parse_excel():
    file = request.files['file']
    session_id = request.form['session_id']
    
    if file.filename.endswith('.xlsx'):
        df = pd.read_excel(file)
    else:
        df = pd.read_csv(file)
        
    df.to_csv(os.path.join(UPLOAD_FOLDER, f'{session_id}_data.csv'), index=False)
    return jsonify({"headers": df.columns.tolist()})

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    placeholders = data.get('placeholders', [])
    session_id = data.get('session_id')
    
    template_path = os.path.join(UPLOAD_FOLDER, f'{session_id}_template.png')
    data_path = os.path.join(UPLOAD_FOLDER, f'{session_id}_data.csv')
    
    if not os.path.exists(template_path) or not os.path.exists(data_path):
        return jsonify({"error": "Missing template or data file. Please re-upload."}), 400

    df = pd.read_csv(data_path)
    generated_files = []
    
    # Load base image into memory once
    base_image = Image.open(template_path).convert("RGB")
    
    loaded_fonts = {}
    for p in placeholders:
        font_file = p.get('fontFile', 'arial.ttf')
        font_path = os.path.join(UPLOAD_FOLDER, f'{session_id}_{font_file}')
        size = int(p['fontSize'])
        font_key = f"{font_file}_{size}"
        if font_key not in loaded_fonts:
            try:
                loaded_fonts[font_key] = ImageFont.truetype(font_path, size)
            except OSError:
                loaded_fonts[font_key] = ImageFont.load_default()
    
    for index, row in df.iterrows():
        img = base_image.copy()
        draw = ImageDraw.Draw(img)
        
        for p in placeholders:
            text = str(row.get(p['mapping'], p['name']))
            font_key = f"{p.get('fontFile', 'arial.ttf')}_{int(p['fontSize'])}"
            font = loaded_fonts[font_key]
            
            hex_c = p['fontColor'].lstrip('#')
            rgb_c = tuple(int(hex_c[i:i+2], 16) for i in (0, 2, 4))
            
            draw.text((p['x'], p['y']), text, font=font, fill=rgb_c, anchor="mm")
        
        filename = f"{session_id}_cert_{index+1}.jpg"
        out_path = os.path.join(OUTPUT_FOLDER, filename)
        # Highly optimized saving
        img.save(out_path, format="JPEG", quality=85, optimize=True)
        generated_files.append(filename)

    base_image.close()

    zip_filename = f'{session_id}_certificates.zip'
    zip_path = os.path.join(OUTPUT_FOLDER, zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in generated_files:
            file_path = os.path.join(OUTPUT_FOLDER, file)
            # Remove session_id prefix in the final ZIP for the user
            clean_name = file.replace(f"{session_id}_", "")
            zipf.write(file_path, clean_name)
            os.remove(file_path) # Clean up individual images instantly to save memory
            
    return jsonify({
        "zip_url": f"/download/{zip_filename}"
    })

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(OUTPUT_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)