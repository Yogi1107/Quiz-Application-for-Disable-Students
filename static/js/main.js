// Toast notification helper
function showToast(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastBody = toast.querySelector('.toast-body');
    const toastHeader = toast.querySelector('.toast-header');
    
    // Set icon based on type
    let icon = 'fa-info-circle';
    let color = 'text-info';
    
    if (type === 'success') {
        icon = 'fa-check-circle';
        color = 'text-success';
    } else if (type === 'error') {
        icon = 'fa-exclamation-circle';
        color = 'text-danger';
    } else if (type === 'warning') {
        icon = 'fa-exclamation-triangle';
        color = 'text-warning';
    }
    
    toastHeader.querySelector('i').className = `fas ${icon} ${color} me-2`;
    toastBody.textContent = message;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Fetch helper with error handling
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }
        
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Text-to-speech function
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.volume = 1.0;
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice =>
            voice.name.includes('Natural') ||
            voice.name.includes('Enhanced') ||
            voice.lang === 'en-US'
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

// Load voices when available
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Validate quiz title
function validateQuizTitle(title) {
    const titleRegex = /^[a-zA-Z_][a-zA-Z0-9_\s]*$/;
    return titleRegex.test(title);
}

// Check if options are unique
function validateUniqueOptions(options) {
    const uniqueOptions = new Set(options.map(opt => opt.trim()));
    return uniqueOptions.size === options.length;
}