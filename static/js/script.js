const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const inspector = document.getElementById('propertiesPanel');

// Generate unique ID for this user's session
const SESSION_ID = 'session_' + Math.random().toString(36).substr(2, 9);

let bgImage = new Image();
let placeholders = []; 
let selectedId = null;
let excelHeaders = [];
let availableFonts = [{ name: 'System Default', file: 'arial.ttf', family: 'Arial' }];
let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

function activateDot(id) {
    document.getElementById(id).classList.add('active');
}

document.getElementById('templateInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        bgImage.src = event.target.result;
        bgImage.onload = () => {
            canvas.width = bgImage.width;
            canvas.height = bgImage.height;
            canvas.style.display = 'block';
            document.getElementById('emptyState').style.display = 'none';
            activateDot('status-template');
            drawCanvas(); 
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', SESSION_ID); // Attach session ID
            fetch('/upload-template', { method: 'POST', body: formData });
            checkReady();
        }
    };
    reader.readAsDataURL(file);
});

document.getElementById('excelInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', SESSION_ID);
    
    fetch('/parse-excel', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
        excelHeaders = data.headers; 
        updateMappingDropdown();
        activateDot('status-data');
        checkReady();
    });
});

document.getElementById('fontInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const fontFamily = 'CustomFont_' + Date.now();
    const fontData = await file.arrayBuffer();
    const font = new FontFace(fontFamily, fontData);
    await font.load();
    document.fonts.add(font);
    
    availableFonts.push({ name: file.name, file: file.name, family: fontFamily });
    updateFontDropdown();
    activateDot('status-font');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', SESSION_ID);
    fetch('/upload-font', { method: 'POST', body: formData });
});

function addTextField() {
    if(!bgImage.src) {
        alert("Please import a template from the left dock first.");
        return;
    }
    const newField = {
        id: Date.now(),
        x: canvas.width / 2, 
        y: canvas.height / 2,
        name: `New Text`,
        mapping: '',
        fontSize: 60,
        fontColor: '#000000',
        fontFile: availableFonts[0].file 
    };
    placeholders.push(newField);
    selectField(newField.id);
    checkReady();
}

function selectField(id) {
    selectedId = id;
    if(selectedId) {
        inspector.classList.add('visible');
        const p = placeholders.find(item => item.id === id);
        document.getElementById('phMapping').value = p.mapping;
        document.getElementById('phFontFamily').value = p.fontFile;
        document.getElementById('phSize').value = p.fontSize;
        document.getElementById('colorPicker').value = p.fontColor;
    } else {
        inspector.classList.remove('visible');
    }
    drawCanvas();
}

function updateSelected() {
    if(!selectedId) return;
    const p = placeholders.find(item => item.id === selectedId);
    p.mapping = document.getElementById('phMapping').value;
    p.fontFile = document.getElementById('phFontFamily').value;
    p.fontSize = parseInt(document.getElementById('phSize').value);
    p.fontColor = document.getElementById('colorPicker').value;
    drawCanvas();
}

function deleteSelected() {
    if(!selectedId) return;
    placeholders = placeholders.filter(p => p.id !== selectedId);
    selectField(null);
    checkReady();
}

function updateMappingDropdown() {
    const sel = document.getElementById('phMapping');
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Custom Text --</option>';
    excelHeaders.forEach(h => {
        sel.innerHTML += `<option value="${h}" ${h === currentVal ? 'selected' : ''}>${h}</option>`;
    });
}

function updateFontDropdown() {
    const sel = document.getElementById('phFontFamily');
    const currentVal = sel.value;
    sel.innerHTML = '';
    availableFonts.forEach(f => {
        sel.innerHTML += `<option value="${f.file}" ${f.file === currentVal ? 'selected' : ''}>${f.name}</option>`;
    });
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

canvas.addEventListener('mousedown', (e) => {
    if (!bgImage.src) return;
    const pos = getCanvasCoords(e);
    let foundId = null;
    for (let i = placeholders.length - 1; i >= 0; i--) {
        const p = placeholders[i];
        if (pos.x >= p.x - 200 && pos.x <= p.x + 200 && pos.y >= p.y - p.fontSize && pos.y <= p.y + p.fontSize) {
            foundId = p.id;
            isDragging = true;
            dragOffsetX = pos.x - p.x;
            dragOffsetY = pos.y - p.y;
            break;
        }
    }
    selectField(foundId);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging || !selectedId) return;
    const pos = getCanvasCoords(e);
    const p = placeholders.find(item => item.id === selectedId);
    p.x = pos.x - dragOffsetX;
    p.y = pos.y - dragOffsetY;
    drawCanvas();
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(bgImage.src) ctx.drawImage(bgImage, 0, 0);

    const rect = canvas.getBoundingClientRect();
    const scaleFactor = rect.width ? (canvas.width / rect.width) : 1;

    placeholders.forEach(p => {
        const isSelected = p.id === selectedId;
        
        ctx.fillStyle = p.fontColor;
        const fontObj = availableFonts.find(f => f.file === p.fontFile);
        const fontFamily = fontObj ? fontObj.family : 'Arial';
        
        ctx.font = `${p.fontSize}px "${fontFamily}", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const textToShow = p.mapping ? `{ ${p.mapping} }` : p.name;
        
        if (isSelected) {
            const metrics = ctx.measureText(textToShow);
            const w = metrics.width + (30 * scaleFactor);
            const h = p.fontSize + (30 * scaleFactor);
            
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2 * scaleFactor;
            ctx.strokeRect(p.x - w/2, p.y - h/2, w, h);
            
            const hSize = 5 * scaleFactor;
            const handles = [
                [p.x - w/2, p.y - h/2], [p.x + w/2, p.y - h/2],
                [p.x - w/2, p.y + h/2], [p.x + w/2, p.y + h/2]
            ];
            ctx.fillStyle = "#ffffff";
            handles.forEach(pos => {
                ctx.fillRect(pos[0] - hSize, pos[1] - hSize, hSize*2, hSize*2);
                ctx.strokeRect(pos[0] - hSize, pos[1] - hSize, hSize*2, hSize*2);
            });
            ctx.fillStyle = p.fontColor;
        }
        ctx.fillText(textToShow, p.x, p.y);
    });
}

function checkReady() {
    generateBtn.disabled = !(placeholders.length > 0 && excelHeaders.length > 0 && bgImage.src);
}

function generateBatch() {
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = "Rendering...";
    generateBtn.disabled = true;

    fetch('/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ placeholders: placeholders, session_id: SESSION_ID }) // Send Session ID
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) alert(data.error);
        else showModal(data.zip_url);
        
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    })
    .catch(err => {
        alert("Server timeout. Try again.");
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    });
}

function showModal(zipUrl) {
    const modal = document.getElementById('exportModal');
    const zipBtn = document.getElementById('downloadZipBtn');
    zipBtn.onclick = () => window.location.href = zipUrl;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('exportModal').style.display = 'none';
}