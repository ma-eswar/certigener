Here are the final files you need to wrap up the project.

### 1. `requirements.txt`
Save this file in your root folder. It lists all the Python libraries required to run the application.

```text
Flask==3.0.0
pandas==2.1.4
openpyxl==3.1.2
Pillow==10.2.0
```

---

### 2. `.gitignore`
**Crucial:** Create a file named `.gitignore` (no extension) to prevent uploading your temporary files, virtual environment, and generated certificates to GitHub.

```text
# Python cache
__pycache__/
*.pyc

# Virtual Environment
venv/
env/

# Application Data (Do not commit user uploads)
uploads/
outputs/

# VS Code / Editor settings
.vscode/
.idea/
```

---

### 3. `README.md`
This is the documentation file that will appear on your GitHub repository's front page.

```markdown
# 🎓 CertGen Basic

**CertGen Basic** is a lightweight, local web application designed to generate bulk certificates from a template image and an Excel file. It is built for schools, event organizers, and HR departments to automate certificate creation without complex software.

## 🚀 Features

- **Drag & Drop Interface**: Visually place text boxes on your certificate template.
- **Excel/CSV Support**: Upload student lists and map columns to placeholders.
- **Custom Branding**:
  - Upload your own Certificate Template (`.png`, `.jpg`).
  - Upload Custom Fonts (`.ttf`).
  - Color Picker for text.
- **Bulk Generation**: Generates hundreds of certificates in seconds.
- **Auto-Zipping**: Downloads all generated certificates as a single ZIP archive.
- **Privacy Focused**: Runs locally on your machine; no data is sent to the cloud.

## 🛠️ Tech Stack

- **Backend**: Python (Flask)
- **Data Processing**: Pandas
- **Image Processing**: Pillow (PIL)
- **Frontend**: HTML5 Canvas, JavaScript, CSS

## 📋 Prerequisites

- Python 3.8 or higher installed on your system.

## 📦 Installation

1. **Clone the repository** (or download source code):
   ```bash
   git clone https://github.com/your-username/CertGen-Basic.git
   cd CertGen-Basic
   ```

2. **Create a Virtual Environment** (Optional but Recommended):
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## 🏃‍♂️ Usage Guide

1. **Start the Application**:
   ```bash
   python app.py
   ```
2. **Open your Browser**:
   Navigate to `http://localhost:5000`.

3. **Workflow**:
   - **Step 1**: Upload a blank Certificate Template image.
   - **Step 2 (Optional)**: Upload a custom `.ttf` font file (e.g., `GreatVibes.ttf`).
   - **Step 3**: Upload your Excel (`.xlsx`) or CSV file containing names/data.
   - **Step 4**: Draw a box on the template using your mouse.
   - **Step 5**: Configure the box in the sidebar:
     - Select the **Text Color**.
     - Map it to an **Excel Column** (e.g., "Name").
     - Adjust font size.
   - **Step 6**: Click **Generate Bulk ZIP** to download your files.

## 📂 Project Structure

```
CertGen-Basic/
│
├── app.py                 # Main Flask Application
├── requirements.txt       # Python Dependencies
├── .gitignore             # Files to exclude from Git
├── static/
│   ├── js/script.js       # Frontend Logic
│   └── css/style.css      # Styling
├── templates/
│   └── index.html         # User Interface
├── uploads/               # (Auto-created) Stores temp user files
└── outputs/               # (Auto-created) Stores generated ZIPs
```

## 🔮 Future Improvements

- Add alignment tools (Left/Right/Center justify).
- Add support for date formatting options.
- Email integration to send certificates directly.

