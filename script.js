let originalImg = null, isDrawing = false, startX = 0, startY = 0;
let undoStack = [], maxUndo = 10;
let snapshot = null;
const canvas = document.getElementById('image-canvas');
const ctx = canvas.getContext('2d');

function saveState() {
  if (undoStack.length >= maxUndo) undoStack.shift();
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  document.getElementById('undo-btn').disabled = false;
}

function undo() {
  if (undoStack.length > 0) {
    ctx.putImageData(undoStack.pop(), 0, 0);
    if (undoStack.length === 0) document.getElementById('undo-btn').disabled = true;
  }
}

function loadImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    originalImg = new Image();
    originalImg.onload = function() {
      canvas.width = originalImg.width;
      canvas.height = originalImg.height;
      resetImage();
      document.getElementById('download-btn').style.display = "inline-block";
      document.getElementById('reset-btn').style.display = "inline-block";
    };
    originalImg.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function resetImage() {
  if (!originalImg) return;
  undoStack = [];
  document.getElementById('undo-btn').disabled = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(originalImg, 0, 0);
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let clientX = e.clientX;
  let clientY = e.clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }

  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function startDraw(e) {
  if (!originalImg) return;
  saveState();
  isDrawing = true;
  const pos = getPos(e);
  startX = pos.x; 
  startY = pos.y;
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  if (document.getElementById('draw-shape').value === 'brush') {
    draw(e);
  }
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPos(e);
  const shape = document.getElementById('draw-shape').value;

  if (shape === 'brush') {
    const size = parseInt(document.getElementById('brush-slider').value);
    applyCensorCircle(pos.x, pos.y, size / 2);
  } else if (shape === 'rect') {
    ctx.putImageData(snapshot, 0, 0);
    
    const width = pos.x - startX;
    const height = pos.y - startY;

    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(startX, startY, width, height);
    ctx.setLineDash([]);
  }
}

function stopDraw(e) {
  if (!isDrawing) return;
  isDrawing = false;
  const shape = document.getElementById('draw-shape').value;

  if (shape === 'rect') {
    ctx.putImageData(snapshot, 0, 0);
    const pos = getPos(e.clientX ? e : e.changedTouches ? e.changedTouches[0] : e);
    
    const x = Math.min(startX, pos.x);
    const y = Math.min(startY, pos.y);
    const w = Math.abs(pos.x - startX);
    const h = Math.abs(pos.y - startY);

    if (w > 5 && h > 5) {
      applyCensorRect(x, y, w, h);
    }
  }
}

function applyCensorCircle(x, y, r) {
  const mode = document.getElementById('censor-mode').value;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  renderEffect(x - r, y - r, r * 2, r * 2, mode);
  ctx.restore();
}

function applyCensorRect(x, y, w, h) {
  const mode = document.getElementById('censor-mode').value;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  renderEffect(x, y, w, h, mode);
  ctx.restore();
}

function renderEffect(x, y, w, h, mode) {
  if (mode === 'blackout') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
  } else if (mode === 'blur') {
    const blurAmt = parseInt(document.getElementById('brush-slider').value);
    const temp = document.createElement('canvas');
    temp.width = canvas.width; 
    temp.height = canvas.height;
    const tCtx = temp.getContext('2d');
    tCtx.filter = `blur(${blurAmt}px)`;
    tCtx.drawImage(canvas, 0, 0);
    ctx.drawImage(temp, 0, 0);
  } else if (mode === 'pixelate') {
    const pSize = Math.max(4, Math.floor(parseInt(document.getElementById('brush-slider').value) / 2));
    const sw = Math.max(1, Math.floor(w / pSize));
    const sh = Math.max(1, Math.floor(h / pSize));
    const temp = document.createElement('canvas');
    temp.width = sw; 
    temp.height = sh;
    const tCtx = temp.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(canvas, x, y, w, h, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, sw, sh, x, y, w, h);
  }
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);

canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDraw);

function downloadImage() {
  if (!originalImg) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'censored-image.png';
  a.click();
}
