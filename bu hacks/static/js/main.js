let stream = null;
let imageData = null;

document.addEventListener('DOMContentLoaded', () => {
    const cameraButton = document.getElementById('cameraButton');
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('fileInput');
    const classifyButton = document.getElementById('classifyButton');
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('preview');
    const previewImage = document.getElementById('previewImage');

    // Camera handling
    cameraButton.addEventListener('click', async () => {
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