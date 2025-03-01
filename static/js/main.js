let stream = null;
let imageData = null;
let isClassifying = false;
let detectionOverlay = null;
let previousDetections = new Map(); // For tracking objects
let trackingColors = new Map(); // For consistent colors per object

document.addEventListener('DOMContentLoaded', () => {
    const cameraButton = document.getElementById('cameraButton');
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('fileInput');
    const classifyButton = document.getElementById('classifyButton');
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('preview');
    const previewImage = document.getElementById('previewImage');
    const results = document.getElementById('results');

    // Add real-time toggle button
    const realTimeButton = document.createElement('button');
    realTimeButton.textContent = '🎥 Start Real-time Detection';
    realTimeButton.className = 'btn';
    document.querySelector('.buttons').appendChild(realTimeButton);

    // Create detection overlay canvas
    detectionOverlay = document.createElement('canvas');
    detectionOverlay.className = 'detection-overlay';
    document.querySelector('.camera-container').appendChild(detectionOverlay);

    // Real-time classification with object tracking
    let lastProcessingTime = 0;
    const PROCESS_INTERVAL = 100; // Process every 100ms

    async function classifyFrame() {
        if (!isClassifying) return;

        const currentTime = Date.now();
        if (currentTime - lastProcessingTime < PROCESS_INTERVAL) {
            requestAnimationFrame(classifyFrame);
            return;
        }
        lastProcessingTime = currentTime;

        const context = canvas.getContext('2d');
        const overlayContext = detectionOverlay.getContext('2d');
        
        // Match canvas sizes to video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        detectionOverlay.width = video.videoWidth;
        detectionOverlay.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Clear previous detections
        overlayContext.clearRect(0, 0, detectionOverlay.width, detectionOverlay.height);

        // Get frame data for classification
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob);

            try {
                const response = await fetch('/classify', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (response.ok) {
                    displayDetections(result.detections, overlayContext);
                }
            } catch (err) {
                console.error('Classification error:', err);
            }

            if (isClassifying) {
                requestAnimationFrame(classifyFrame);
            }
        }, 'image/jpeg', 0.8);
    }

    function displayDetections(detections, context) {
        const currentDetections = new Map();
        
        // Update results panel first
        updateResultsPanel(detections);
        
        detections.forEach(detection => {
            const [x1, y1, x2, y2] = detection.bbox;
            const width = x2 - x1;
            const height = y2 - y1;
            const id = detection.id;
            const detectionType = detection.detection_type || "yolo";

            // Get or generate tracking color - use special colors for packaging
            if (!trackingColors.has(id)) {
                if (isPackaging(detection.object_name)) {
                    // Use a blue-based color for packaging
                    trackingColors.set(id, getPackagingColor());
                } else {
                    trackingColors.set(id, getRandomColor());
                }
            }
            const color = trackingColors.get(id);

            // Draw tracking trail if object was previously detected
            if (previousDetections.has(id)) {
                const prev = previousDetections.get(id);
                const prevCenterX = prev.x + prev.width / 2;
                const prevCenterY = prev.y + prev.height / 2;
                const currentCenterX = x1 + width / 2;
                const currentCenterY = y1 + height / 2;

                // Draw trail line
                context.beginPath();
                context.moveTo(prevCenterX, prevCenterY);
                context.lineTo(currentCenterX, currentCenterY);
                context.strokeStyle = color + '80'; // Semi-transparent
                context.lineWidth = 2;
                context.stroke();
            }

            // Draw different box styles based on detection type
            context.strokeStyle = color;
            context.lineWidth = 3;
            
            if (detectionType === "custom") {
                // Custom detection gets special styling
                drawCustomPackageBox(context, x1, y1, width, height, color);
            } else if (isPackaging(detection.object_name)) {
                drawPackagingBox(context, x1, y1, width, height);
            } else {
                drawAnimatedBox(context, x1, y1, width, height);
            }

            // Draw label background
            const confidence = Math.round(detection.confidence * 100);
            const label = `${detection.object_name} (${confidence}%)`;
            context.font = '16px Arial';
            const labelWidth = context.measureText(label).width + 10;
            const labelHeight = 25;
            
            // Gradient background for label
            const gradient = context.createLinearGradient(x1, y1 - labelHeight, x1, y1);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, color + 'CC');
            context.fillStyle = gradient;
            context.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

            // Draw label text
            context.fillStyle = '#ffffff';
            context.fillText(label, x1 + 5, y1 - 5);

            // Store current position for tracking
            currentDetections.set(id, {
                x: x1,
                y: y1,
                width: width,
                height: height
            });
        });

        // Update previous detections for next frame
        previousDetections = currentDetections;
    }

    function drawAnimatedBox(context, x, y, width, height) {
        const length = Math.min(width, height) * 0.2;
        
        // Draw corners
        context.beginPath();
        // Top-left
        context.moveTo(x, y + length);
        context.lineTo(x, y);
        context.lineTo(x + length, y);
        // Top-right
        context.moveTo(x + width - length, y);
        context.lineTo(x + width, y);
        context.lineTo(x + width, y + length);
        // Bottom-right
        context.moveTo(x + width, y + height - length);
        context.lineTo(x + width, y + height);
        context.lineTo(x + width - length, y + height);
        // Bottom-left
        context.moveTo(x + length, y + height);
        context.lineTo(x, y + height);
        context.lineTo(x, y + height - length);
        
        context.stroke();
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function getCategoryColor(category) {
        const colors = {
            'Recyclable': '#2ecc71',
            'Organic': '#f1c40f',
            'E-Waste': '#e74c3c',
            'Trash': '#95a5a6',
            'Unknown': '#34495e'
        };
        return colors[category] || colors['Unknown'];
    }

    function updateResultsPanel(detections) {
        const resultsDiv = document.getElementById('results');
        
        if (detections.length === 0) {
            resultsDiv.innerHTML = `
                <div class="empty-result">
                    <div class="empty-icon"><i class="bi bi-search"></i></div>
                    <p>No waste items detected. Try another angle or image.</p>
                </div>
            `;
            return;
        }

        resultsDiv.innerHTML = '';
        
        // Sort by confidence and detection type
        detections.sort((a, b) => {
            const typeOrder = { 'color': 0, 'custom': 1, 'shape': 2, 'yolo': 3, 'fallback': 4, 'forced': 5 };
            const typeA = typeOrder[a.detection_type] || 3;
            const typeB = typeOrder[b.detection_type] || 3;
            
            if (typeA !== typeB) return typeA - typeB;
            return b.confidence - a.confidence;
        });

        detections.forEach(detection => {
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            // Add data attribute for the bin for styling
            resultCard.setAttribute('data-bin', detection.bin);
            
            // Special styling based on detection type
            if (detection.detection_type === "color" || detection.detection_type === "custom" || detection.detection_type === "shape") {
                resultCard.classList.add('package-card');
            } else if (isPackaging(detection.object_name)) {
                resultCard.classList.add('packaging-card');
            }
            
            const confidencePercent = Math.round(detection.confidence * 100);
            let confidenceLabel = 'Low';
            let confidenceIcon = 'bi-reception-1';
            
            if (confidencePercent >= 80) {
                confidenceLabel = 'High';
                confidenceIcon = 'bi-reception-4';
            } else if (confidencePercent >= 50) {
                confidenceLabel = 'Medium';
                confidenceIcon = 'bi-reception-3';
            }
            
            // Choose category icon
            let categoryIcon = 'bi-tag';
            if (detection.category === 'Recyclable') categoryIcon = 'bi-recycle';
            else if (detection.category === 'Organic') categoryIcon = 'bi-tree';
            else if (detection.category === 'Trash') categoryIcon = 'bi-trash';
            
            // Choose bin icon based on bin color
            let binIcon = 'bi-trash2';
            if (detection.bin === 'Blue Bin') binIcon = 'bi-recycle';
            else if (detection.bin === 'Green Bin') binIcon = 'bi-tree';
            
            resultCard.innerHTML = `
                <div class="result-header">
                    <span class="result-type">${detection.object_name}</span>
                    <span class="confidence-badge"><i class="bi ${confidenceIcon}"></i> ${confidenceLabel} (${confidencePercent}%)</span>
                </div>
                <div class="category-info">
                    <span class="info-icon"><i class="bi ${categoryIcon}"></i></span>
                    <span>Category: <strong>${detection.category}</strong></span>
                </div>
                <div class="bin-info">
                    <span class="info-icon"><i class="bi ${binIcon}"></i></span>
                    <span>Bin: <strong>${detection.bin}</strong></span>
                </div>
                <div class="tip-info">
                    <span class="info-icon"><i class="bi bi-lightbulb"></i></span>
                    <span>Tip: ${detection.tips}</span>
                </div>
            `;
            
            resultsDiv.appendChild(resultCard);
        });
    }

    realTimeButton.addEventListener('click', async () => {
        if (!stream) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',  // Prefer back camera on mobile
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                video.srcObject = stream;
                video.style.display = 'block';
                preview.style.display = 'none';
                results.style.display = 'block';
                isClassifying = true;
                realTimeButton.textContent = '⏹️ Stop Real-time Detection';
                classifyFrame();
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Could not access camera. Please ensure you have granted camera permissions.');
            }
        } else {
            // Stop real-time classification
            isClassifying = false;
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            video.style.display = 'none';
            results.style.display = 'none';
            realTimeButton.textContent = '🎥 Start Real-time Detection';
        }
    });

    // Camera handling
    cameraButton.addEventListener('click', async () => {
        if (isClassifying) return; // Don't allow single captures during real-time mode
        
        try {
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                video.style.display = 'block';
                cameraButton.textContent = '📸 Capture';
            } else {
                // Capture photo
                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert to blob and display preview
                canvas.toBlob((blob) => {
                    imageData = blob;
                    previewImage.src = URL.createObjectURL(blob);
                    preview.style.display = 'block';
                    video.style.display = 'none';
                    
                    // Stop camera stream
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                    cameraButton.textContent = '📸 Take Photo';
                });
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please ensure you have granted camera permissions.');
        }
    });

    // File upload handling
    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            imageData = file;
            previewImage.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        }
    });

    // Classification handling
    classifyButton.addEventListener('click', async () => {
        if (!imageData) {
            alert('Please capture or upload an image first');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageData);

        try {
            const response = await fetch('/classify', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                displayResults(result);
            } else {
                throw new Error(result.error || 'Classification failed');
            }
        } catch (err) {
            console.error('Error during classification:', err);
            alert('Failed to classify image. Please try again.');
        }
    });
});

function displayResults(result) {
    const results = document.getElementById('results');
    document.getElementById('categoryText').textContent = `Category: ${result.category}`;
    document.getElementById('binText').textContent = `Bin: ${result.bin}`;
    document.getElementById('confidenceText').textContent = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
    document.getElementById('tipsText').textContent = `Tip: ${result.tips}`;
    results.style.display = 'block';
}

// Add this function to check if an object is likely packaging
function isPackaging(objectName) {
    const packagingTerms = ['box', 'carton', 'package', 'packaging', 'wrapper', 'container', 'bottle', 'can'];
    return packagingTerms.some(term => objectName.includes(term));
}

// Add a specialized function for drawing packaging boxes
function drawPackagingBox(context, x, y, width, height) {
    // Draw dotted rectangle for packaging
    context.setLineDash([5, 3]);
    context.strokeRect(x, y, width, height);
    context.setLineDash([]);
    
    // Draw package icon
    context.fillStyle = '#ffffff80';
    const boxSize = Math.min(width, height) * 0.2;
    if (boxSize > 15) {
        // Simple box icon
        context.fillRect(x + width - boxSize - 5, y + 5, boxSize, boxSize);
        context.strokeRect(x + width - boxSize - 5, y + 5, boxSize, boxSize);
        // Add recycle symbol indication
        context.beginPath();
        context.arc(x + width - boxSize/2 - 5, y + boxSize/2 + 5, boxSize/3, 0, 2 * Math.PI);
        context.stroke();
    }
}

// Add a specialized color function for packaging
function getPackagingColor() {
    // Generate shades of blue/green for packaging
    const r = Math.floor(Math.random() * 100);
    const g = Math.floor(Math.random() * 100 + 120);
    const b = Math.floor(Math.random() * 100 + 155);
    return `rgb(${r}, ${g}, ${b})`;
}

// Add new function for custom package boxes
function drawCustomPackageBox(context, x, y, width, height, color) {
    // Draw highlighted package box
    context.setLineDash([3, 3]);
    context.strokeRect(x, y, width, height);
    
    // Add diagonal lines for emphasis
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y + height);
    context.moveTo(x + width, y);
    context.lineTo(x, y + height);
    context.stroke();
    context.setLineDash([]);
    
    // Add "PACKAGE" text in center if big enough
    if (width > 60 && height > 30) {
        context.fillStyle = color + '40'; // Very transparent
        context.fillRect(x + width/4, y + height/2 - 10, width/2, 20);
        context.fillStyle = '#FFFFFF';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText("PACKAGE", x + width/2, y + height/2 + 4);
        context.textAlign = 'left'; // Reset
    }
}

// Update the handleFileUpload function to use a specific error handler
function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    // Show loading indicator
    const results = document.getElementById('results');
    results.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Analyzing trash items...</p>
        </div>
    `;
    
    fetch('/classify', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Classification failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            displayError(data.error);
        } else {
            // Process and display results
            updateResultsPanel(data.detections);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayError("Failed to detect trash items. Try another image or angle.");
    });
}

// Add error display function
function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="error-container">
            <div class="error-icon"><i class="bi bi-exclamation-triangle"></i></div>
            <p>${message}</p>
            <p class="error-help">Try these tips:</p>
            <ul>
                <li>Make sure items are clearly visible in the frame</li>
                <li>Try better lighting conditions</li>
                <li>Include only waste items in the photo</li>
                <li>Hold the camera steady</li>
            </ul>
            <button id="retryBtn" class="btn btn-secondary">Try Again</button>
        </div>
    `;
    
    // Add event listener for the retry button
    document.getElementById('retryBtn').addEventListener('click', () => {
        document.getElementById('cameraButton').click();
    });
}

// Add this new function to handle the specific classification
function classifyUploadedImage() {
    // Show a loading indicator first
    const results = document.getElementById('results');
    results.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Analyzing waste items...</p>
        </div>
    `;
    
    const formData = new FormData();
    const canvas = document.getElementById('canvas');
    
    canvas.toBlob((blob) => {
        formData.append('image', blob);
        
        fetch('/classify', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                displayError(data.error);
            } else if (data.detections && data.detections.length > 0) {
                // We have detections! Show them
                updateResultsPanel(data.detections);
            } else {
                // No detections - show generic fallback
                displayError("No items detected. Try a different angle or lighting.");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayError("Classification failed. Please try again.");
        });
    }, 'image/jpeg', 0.95);
} 