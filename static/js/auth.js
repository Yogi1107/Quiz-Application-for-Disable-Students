let currentRole = null;
let isLoginMode = true;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupRoleSelection();
    setupAuthForm();
    setupAuthToggle();
    
    // Announce page load
    speakText('Welcome to the Accessible Quiz Platform. Please select your role and sign in to continue.');
});

// Setup role selection
function setupRoleSelection() {
    const roleCards = document.querySelectorAll('.role-card');
    
    roleCards.forEach(card => {
        card.addEventListener('click', function() {
            roleCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            currentRole = this.dataset.role;
            
            const roleTitle = this.querySelector('h5').textContent;
            speakText(roleTitle + ' role selected');
        });
    });
}

// Setup auth form
function setupAuthForm() {
    const form = document.getElementById('auth-form');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentRole) {
            showToast('Please select a role (Teacher or Student)', 'error');
            speakText('Please select a role first');
            return;
        }
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (isLoginMode) {
            await handleLogin(username, password, currentRole);
        } else {
            await handleRegistration(username, password, email, confirmPassword, currentRole);
        }
    });
}

// Setup auth toggle
function setupAuthToggle() {
    const toggleBtn = document.getElementById('auth-toggle-btn');
    
    toggleBtn.addEventListener('click', function() {
        toggleAuthMode();
    });
}

// Toggle between login and registration
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const emailGroup = document.getElementById('email-group');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    
    if (isLoginMode) {
        title.textContent = 'Welcome - Please Sign In';
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        toggleBtn.textContent = "Don't have an account? Register here";
        emailGroup.style.display = 'none';
        confirmPasswordGroup.style.display = 'none';
        speakText('Switched to login mode');
    } else {
        title.textContent = 'Create Your Account';
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
        toggleBtn.textContent = 'Already have an account? Sign in here';
        emailGroup.style.display = 'block';
        confirmPasswordGroup.style.display = 'block';
        speakText('Switched to registration mode');
    }
}

// Handle login
async function handleLogin(username, password, role) {
    try {
        const data = await fetchAPI('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
        
        showToast('Login successful!', 'success');
        speakText(`Welcome ${username}! You have successfully logged in as a ${role}.`);
        
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
    }
}

// Handle registration
async function handleRegistration(username, password, email, confirmPassword, role) {
    // Validation
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        speakText('Password must be at least 6 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        speakText('Passwords do not match');
        return;
    }
    
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        speakText('Please enter a valid email address');
        return;
    }
    
    try {
        const data = await fetchAPI('/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email, role })
        });
        
        showToast('Registration successful!', 'success');
        speakText(`Welcome ${username}! Your account has been created successfully.`);
        
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
    } catch (error) {
        console.error('Registration error:', error);
    }
}