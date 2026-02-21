const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
let bgImage = new Image();
let placeholders = []; // Stores {id, rect: {x,y,w,h}, style: {}, mapping: ''}
let selectedPlaceholderId = null;
let isDragging = false;
let startX, startY;
let excelHeaders = [];
let currentFontFile = 'arial.ttf'; // Default

// 1. Load Template
document.getElementById('templateInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        bgImage.src = event.target.result;
        bgImage.onload = () => {
            // Resize canvas to match image
            canvas.width = bgImage.width;
            canvas.height = bgImage.height;
            // Scale down visually if too big using CSS
            canvas.style.width = '100%'; 
            canvas.style.height = 'auto';
            drawCanvas();
            
            // Send to backend
            const formData = new FormData();
            formData.append('file', file);
            fetch('/upload-template', {method: 'POST', body: formData});
        }
    };
    reader.readAsDataURL(file);
});

// 2. Load Custom Font
document.getElementById('fontInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    // A. Add to Browser (Visuals)
    const fontName = 'CustomFont';
    const fontData = await file.arrayBuffer();
    const font = new FontFace(fontName, fontData);
    await font.load();
    document.fonts.add(font);
    currentFontFile = file.name; // Store filename for backend

    // B. Send to Backend (Processing)
    const formData = new FormData();
    formData.append('file', file);
    fetch('/upload-font', {method: 'POST', body: formData});
    
    alert("Font loaded! New placeholders will use this font.");
});

// 3. Load Excel
document.getElementById('excelInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/parse-excel', {method: 'POST', body: formData})
    .then(r => r.json())
    .then(data => {
        excelHeaders = data.headers;
        updateMappingDropdown();
        alert("Excel loaded. You can now map placeholders.");
    });
});

// --- CANVAS INTERACTION ---

// Mouse Down: Select or Start Drawing
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check if clicked existing placeholder
    const clicked = placeholders.find(p => 
        mouseX >= p.rect.x && mouseX <= p.rect.x + p.rect.w &&
        mouseY >= p.rect.y && mouseY <= p.rect.y + p.rect.h
    );

    if (clicked) {
        selectedPlaceholderId = clicked.id;
        loadSidebarData(clicked);
    } else {
        // Start drawing new one
        selectedPlaceholderId = null;
        isDragging = true;
        startX = mouseX;
        startY = mouseY;
    }
    drawCanvas();
});

// Mouse Up: Finish Drawing
canvas.addEventListener('mouseup', (e) => {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const w = mouseX - startX;
        const h = mouseY - startY;

        if (Math.abs(w) > 20 && Math.abs(h) > 20) {
            const newId = Date.now();
            placeholders.push({
                id: newId,
                rect: { x: startX, y: startY, w: w, h: h },
                style: { 
                    fontSize: 40, 
                    fontColor: document.getElementById('colorPicker').value,
                    fontFile: currentFontFile 
                },
                mapping: ''
            });
            selectedPlaceholderId = newId;
            loadSidebarData(placeholders[placeholders.length-1]);
        }
        isDragging = false;
        drawCanvas();
    }
});

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0);

    placeholders.forEach(p => {
        const isSelected = p.id === selectedPlaceholderId;
        
        // Draw Box
        ctx.strokeStyle = isSelected ? 'blue' : 'gray';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.setLineDash(isSelected ? [] : [5, 5]);
        ctx.strokeRect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);

        // Draw Text Preview
        ctx.fillStyle = p.style.fontColor;
        // Use custom font in browser if loaded, else Arial
        const fontFamily = (p.style.fontFile !== 'arial.ttf') ? 'CustomFont' : 'Arial';
        ctx.font = `${p.style.fontSize}px ${fontFamily}`;
        
        // Simple Center Alignment for Preview
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const centerX = p.rect.x + (p.rect.w / 2);
        const centerY = p.rect.y + (p.rect.h / 2);
        
        ctx.fillText(p.mapping || p.style.fontFile, centerX, centerY);
    });
}

// --- UI HELPERS ---

function loadSidebarData(p) {
    document.getElementById('placeholderControls').style.display = 'block';
    document.getElementById('phName').value = p.name || '';
    document.getElementById('phSize').value = p.style.fontSize;
    document.getElementById('colorPicker').value = p.style.fontColor;
    updateMappingDropdown(p.mapping);
}

function updateMappingDropdown(selectedVal) {
    const sel = document.getElementById('phMapping');
    sel.innerHTML = '<option value="">-- Select Excel Column --</option>';
    excelHeaders.forEach(h => {
        const option = document.createElement('option');
        option.value = h;
        option.text = h;
        if(h === selectedVal) option.selected = true;
        sel.appendChild(option);
    });
}

function updatePlaceholder() {
    if(!selectedPlaceholderId) return;
    const p = placeholders.find(item => item.id === selectedPlaceholderId);
    
    p.name = document.getElementById('phName').value;
    p.mapping = document.getElementById('phMapping').value;
    p.style.fontSize = document.getElementById('phSize').value;
    p.style.fontColor = document.getElementById('colorPicker').value;
    
    drawCanvas();
}

function deletePlaceholder() {
    if(!selectedPlaceholderId) return;
    placeholders = placeholders.filter(p => p.id !== selectedPlaceholderId);
    selectedPlaceholderId = null;
    document.getElementById('placeholderControls').style.display = 'none';
    drawCanvas();
}

function generateCertificates() {
    fetch('/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ placeholders: placeholders })
    })
    .then(r => r.json())
    .then(data => {
        window.location.href = data.download_url;
    });
}