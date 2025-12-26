
// Global variables
let currentUser = null;
let currentRole = null;
let currentQuestionIndex = 0;
let currentQuizData = null;
let questionCount = 1;
let recognition;
let isListening = false;
let awaitingNextConfirmation = false;
let optionSubmitted = false;
let isLoginMode = true;
let selectedQuizForTaking = null;

// Mock database - In production, this would be replaced with actual backend API calls
let users = {
    'teacher1': { username: 'teacher1', password: 'password123', role: 'teacher', email: 'teacher@example.com' },
    'student1': { username: 'student1', password: 'password123', role: 'student', email: 'student@example.com' }
};

let quizzes = {};
let quizResults = {};

// Initialize the application
function initializeApp() {
    initSpeechRecognition();
    setupEventListeners();
    setupRoleSelection();
    announcePageLoad();
}

// Announce page load for screen readers
function announcePageLoad() {
    speakText('Welcome to the Accessible Quiz Platform. Please select your role and sign in to continue.');
}

// Setup event listeners
function setupEventListeners() {
    // Auth form submission
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

    // Quiz creation
    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    document.getElementById('quiz-form').addEventListener('submit', saveQuiz);

    // Option clicking for quiz taking
    document.querySelectorAll('.option-item').forEach(option => {
        option.addEventListener('click', function () {
            if (!optionSubmitted) {
                selectOption(this.getAttribute('data-option'));
            }
        });
    });
}

// Setup role selection
function setupRoleSelection() {
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', function () {
            document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            currentRole = this.getAttribute('data-role');

            // Announce selection for screen readers
            const roleTitle = this.querySelector('.role-title').textContent;
            speakText(roleTitle + ' role selected');
        });
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

// Handle authentication form submission
function handleAuthSubmit(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!currentRole) {
        showMessage('Please select a role (Teacher or Student)', 'error');
        speakText('Please select a role first');
        return;
    }

    if (isLoginMode) {
        handleLogin(username, password);
    } else {
        handleRegistration(username, password, email, confirmPassword);
    }
}

// Handle user login
function handleLogin(username, password) {
    const user = users[username];

    if (!user || user.password !== password) {
        showMessage('Invalid username or password', 'error');
        speakText('Invalid username or password');
        return;
    }

    if (user.role !== currentRole) {
        showMessage(`This account is registered as a ${user.role}, not a ${currentRole}`, 'error');
        speakText(`This account is registered as a ${user.role}, not a ${currentRole}`);
        return;
    }

    // Successful login
    currentUser = user;
    showMessage('Login successful!', 'success');
    speakText(`Welcome ${username}! You have successfully logged in as a ${currentRole}.`);

    setTimeout(() => {
        showDashboard();
    }, 1000);
}

// Handle user registration
function handleRegistration(username, password, email, confirmPassword) {
    // Validation
    if (users[username]) {
        showMessage('Username already exists', 'error');
        speakText('Username already exists');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        speakText('Password must be at least 6 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        speakText('Passwords do not match');
        return;
    }

    if (!email || !email.includes('@')) {
        showMessage('Please enter a valid email address', 'error');
        speakText('Please enter a valid email address');
        return;
    }

    // Create new user
    users[username] = {
        username: username,
        password: password,
        email: email,
        role: currentRole
    };

    currentUser = users[username];
    showMessage('Registration successful!', 'success');
    speakText(`Welcome ${username}! Your account has been created successfully.`);

    setTimeout(() => {
        showDashboard();
    }, 1000);
}

// Show appropriate dashboard based on user role
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';

    // Show user info
    const userInfo = document.getElementById('user-info');
    const userRole = document.getElementById('user-role');
    const userName = document.getElementById('user-name');

    userInfo.style.display = 'flex';
    userRole.textContent = currentUser.role.toUpperCase();
    userName.textContent = currentUser.username;

    if (currentUser.role === 'teacher') {
        document.getElementById('teacher-dashboard').classList.remove('hidden');
        loadTeacherQuizzes();
        speakText('Teacher dashboard loaded. You can create quizzes, manage existing quizzes, and view student results.');
    } else {
        document.getElementById('student-dashboard').classList.remove('hidden');
        loadAvailableQuizzes();
        speakText('Student dashboard loaded. You can browse available quizzes, take quizzes, and view your results.');
    }
}

// Logout function
function logout() {
    currentUser = null;
    currentRole = null;

    // Reset all forms and states
    document.getElementById('auth-form').reset();
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));

    // Hide dashboards
    document.getElementById('teacher-dashboard').classList.add('hidden');
    document.getElementById('student-dashboard').classList.add('hidden');
    document.getElementById('user-info').style.display = 'none';

    // Show auth section
    document.getElementById('auth-section').style.display = 'block';

    // Stop any ongoing speech recognition
    if (isListening) {
        stopListening();
    }

    clearMessages();
    speakText('You have been logged out successfully');
}

// Show message to user
function showMessage(message, type) {
    const messagesContainer = document.getElementById('auth-messages');
    messagesContainer.innerHTML = `<div class="message ${type}">${message}</div>`;

    // Auto-clear message after 5 seconds
    setTimeout(() => {
        clearMessages();
    }, 5000);
}

// Clear messages
function clearMessages() {
    document.getElementById('auth-messages').innerHTML = '';
}

// Switch between tabs
function switchTab(tabName) {
    // Determine which dashboard we're in
    const isTeacher = !document.getElementById('teacher-dashboard').classList.contains('hidden');
    const isStudent = !document.getElementById('student-dashboard').classList.contains('hidden');

    if (isTeacher) {
        // Teacher tabs
        document.querySelectorAll('#teacher-dashboard .tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('#teacher-dashboard .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(tabName + '-tab').classList.add('active');
        document.getElementById(tabName + '-tab-btn').classList.add('active');

        // Load content based on tab
        if (tabName === 'manage-quiz') {
            loadTeacherQuizzes();
        } else if (tabName === 'view-results') {
            loadQuizResults();
        }
    } else if (isStudent) {
        // Student tabs
        document.querySelectorAll('#student-dashboard .tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('#student-dashboard .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(tabName + '-tab').classList.add('active');
        document.getElementById(tabName + '-tab-btn').classList.add('active');

        // Load content based on tab
        if (tabName === 'available-quiz') {
            loadAvailableQuizzes();
        } else if (tabName === 'my-results') {
            loadStudentResults();
        }
    }

    // Stop speech recognition when switching away from take-quiz tab
    if (tabName !== 'take-quiz' && isListening) {
        stopListening();
    }
}

// Add a new question in the create quiz form
function addQuestion() {
    questionCount++;
    const questionContainer = document.getElementById('question-container');

    const newQuestionDiv = document.createElement('div');
    newQuestionDiv.classList.add('form-group');
    newQuestionDiv.innerHTML = `
                <hr style="margin: 20px 0;">
                <label for="question-${questionCount}">Question ${questionCount}:</label>
                <input type="text" id="question-${questionCount}" name="question" placeholder="Enter your question" required>
                
                <label>Options:</label>
                <div class="options-grid">
                    <input type="text" name="option-a" placeholder="Option A" required>
                    <input type="text" name="option-b" placeholder="Option B" required>
                    <input type="text" name="option-c" placeholder="Option C" required>
                    <input type="text" name="option-d" placeholder="Option D" required>
                </div>
                
                <label for="correct-answer-${questionCount}">Correct Answer:</label>
                <select id="correct-answer-${questionCount}" name="correct-answer" required>
                    <option value="">Select correct answer</option>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                </select>
            `;

    questionContainer.appendChild(newQuestionDiv);
    speakText('New question added. Question ' + questionCount);
}

// Validate quiz title
function validateQuizTitle(title) {
    const titleRegex = /^[a-zA-Z_][a-zA-Z0-9_\s]*$/;
    return titleRegex.test(title);
}

// Validate that all options are unique within a question
function validateUniqueOptions(optionA, optionB, optionC, optionD) {
    const options = [optionA, optionB, optionC, optionD];
    const uniqueOptions = new Set(options);
    return uniqueOptions.size === options.length;
}

// Save quiz
function saveQuiz(event) {
    event.preventDefault();

    const quizTitle = document.getElementById('quiz-title').value.trim();
    const quizDescription = document.getElementById('quiz-description').value.trim();

    if (!validateQuizTitle(quizTitle)) {
        showMessage('Quiz title must start with a letter or underscore and contain only letters, numbers, spaces, or underscores.', 'error');
        speakText('Invalid quiz title format');
        return;
    }

    // Check if quiz title already exists for this teacher
    const teacherQuizzes = quizzes[currentUser.username] || {};
    if (teacherQuizzes[quizTitle]) {
        showMessage('A quiz with this title already exists. Please choose a different title.', 'error');
        speakText('Quiz title already exists');
        return;
    }

    const questionInputs = document.querySelectorAll('input[name="question"]');
    const optionAs = document.querySelectorAll('input[name="option-a"]');
    const optionBs = document.querySelectorAll('input[name="option-b"]');
    const optionCs = document.querySelectorAll('input[name="option-c"]');
    const optionDs = document.querySelectorAll('input[name="option-d"]');
    const correctAnswers = document.querySelectorAll('select[name="correct-answer"]');

    // Validate each question
    const quizQuestions = [];
    for (let i = 0; i < questionInputs.length; i++) {
        const optionA = optionAs[i].value.trim();
        const optionB = optionBs[i].value.trim();
        const optionC = optionCs[i].value.trim();
        const optionD = optionDs[i].value.trim();

        if (!validateUniqueOptions(optionA, optionB, optionC, optionD)) {
            showMessage(`Question ${i + 1}: All options must be unique.`, 'error');
            speakText(`Question ${i + 1}: All options must be unique`);
            return;
        }

        if (!correctAnswers[i].value) {
            showMessage(`Question ${i + 1}: Please select the correct answer.`, 'error');
            speakText(`Question ${i + 1}: Please select the correct answer`);
            return;
        }

        quizQuestions.push({
            question: questionInputs[i].value.trim(),
            options: [optionA, optionB, optionC, optionD],
            correctAnswer: correctAnswers[i].value
        });
    }

    // Save quiz to database
    if (!quizzes[currentUser.username]) {
        quizzes[currentUser.username] = {};
    }

    quizzes[currentUser.username][quizTitle] = {
        title: quizTitle,
        description: quizDescription,
        questions: quizQuestions,
        createdBy: currentUser.username,
        createdAt: new Date().toISOString(),
        id: Date.now().toString()
    };

    // Show preview
    showQuizPreview(quizTitle, quizDescription, quizQuestions);

    // Reset form
    document.getElementById('quiz-form').reset();
    questionCount = 1;

    // Reset question container to just one question
    const questionContainer = document.getElementById('question-container');
    const extraQuestions = questionContainer.querySelectorAll('.form-group');
    for (let i = 1; i < extraQuestions.length; i++) {
        extraQuestions[i].remove();
    }

    showMessage('Quiz saved successfully!', 'success');
    speakText(`Quiz "${quizTitle}" has been saved successfully with ${quizQuestions.length} questions.`);
}

// Show quiz preview
function showQuizPreview(title, description, questions) {
    const previewContainer = document.getElementById('quiz-preview');

    let previewHTML = `
                <div class="quiz-item">
                    <div class="quiz-header">
                        <div>
                            <div class="quiz-title">${title}</div>
                            <div class="quiz-meta">
                                <div><i class="fas fa-info-circle"></i> ${description}</div>
                                <div><i class="fas fa-question-circle"></i> ${questions.length} questions</div>
                                <div><i class="fas fa-calendar"></i> Created: ${new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
            `;

    questions.forEach((q, index) => {
        previewHTML += `
                    <div class="question-card">
                        <div class="question-text">Q${index + 1}: ${q.question}</div>
                        <ul class="question-options">
                            <li>A: ${q.options[0]} ${q.correctAnswer === 'A' ? '✓' : ''}</li>
                            <li>B: ${q.options[1]} ${q.correctAnswer === 'B' ? '✓' : ''}</li>
                            <li>C: ${q.options[2]} ${q.correctAnswer === 'C' ? '✓' : ''}</li>
                            <li>D: ${q.options[3]} ${q.correctAnswer === 'D' ? '✓' : ''}</li>
                        </ul>
                    </div>
                `;
    });

    previewHTML += '</div>';
    previewContainer.innerHTML = previewHTML;
}

// Load teacher's quizzes for management
function loadTeacherQuizzes() {
    const container = document.getElementById('teacher-quiz-list');
    const teacherQuizzes = quizzes[currentUser.username] || {};

    if (Object.keys(teacherQuizzes).length === 0) {
        container.innerHTML = `
                    <div class="message info">
                        <i class="fas fa-info-circle"></i> You haven't created any quizzes yet. Use the "Create Quiz" tab to get started.
                    </div>
                `;
        return;
    }

    let quizHTML = '';
    Object.values(teacherQuizzes).forEach(quiz => {
        const studentAttempts = getQuizAttempts(quiz.id);
        quizHTML += `
                    <div class="quiz-item">
                        <div class="quiz-header">
                            <div>
                                <div class="quiz-title">${quiz.title}</div>
                                <div class="quiz-meta">
                                    <div><i class="fas fa-info-circle"></i> ${quiz.description}</div>
                                    <div><i class="fas fa-question-circle"></i> ${quiz.questions.length} questions</div>
                                    <div><i class="fas fa-users"></i> ${studentAttempts} student attempts</div>
                                    <div><i class="fas fa-calendar"></i> Created: ${new Date(quiz.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div class="quiz-actions">
                                <button class="btn btn-secondary" onclick="viewQuizDetails('${quiz.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn btn-warning" onclick="editQuiz('${quiz.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn" style="background-color: var(--danger);" onclick="deleteQuiz('${quiz.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    });

    container.innerHTML = quizHTML;
}

// Load available quizzes for students
function loadAvailableQuizzes() {
    const container = document.getElementById('student-quiz-list');
    let availableQuizzes = [];

    // Collect all quizzes from all teachers
    Object.values(quizzes).forEach(teacherQuizzes => {
        Object.values(teacherQuizzes).forEach(quiz => {
            availableQuizzes.push(quiz);
        });
    });

    if (availableQuizzes.length === 0) {
        container.innerHTML = `
                    <div class="message info">
                        <i class="fas fa-info-circle"></i> No quizzes are currently available. Please check back later.
                    </div>
                `;
        return;
    }

    let quizHTML = '';
    availableQuizzes.forEach(quiz => {
        const hasAttempted = hasStudentAttempted(currentUser.username, quiz.id);
        quizHTML += `
                    <div class="quiz-item">
                        <div class="quiz-header">
                            <div>
                                <div class="quiz-title">${quiz.title}</div>
                                <div class="quiz-meta">
                                    <div><i class="fas fa-info-circle"></i> ${quiz.description}</div>
                                    <div><i class="fas fa-question-circle"></i> ${quiz.questions.length} questions</div>
                                    <div><i class="fas fa-user-tie"></i> Created by: ${quiz.createdBy}</div>
                                    <div><i class="fas fa-calendar"></i> ${new Date(quiz.createdAt).toLocaleDateString()}</div>
                                    ${hasAttempted ? '<div style="color: var(--success);"><i class="fas fa-check-circle"></i> Completed</div>' : ''}
                                </div>
                            </div>
                            <div class="quiz-actions">
                                <button class="btn" onclick="startQuizAttempt('${quiz.id}')">
                                    <i class="fas fa-play"></i> ${hasAttempted ? 'Retake Quiz' : 'Start Quiz'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    });

    container.innerHTML = quizHTML;
}

// Start quiz attempt
function startQuizAttempt(quizId) {
    // Find the quiz
    let targetQuiz = null;
    Object.values(quizzes).forEach(teacherQuizzes => {
        Object.values(teacherQuizzes).forEach(quiz => {
            if (quiz.id === quizId) {
                targetQuiz = quiz;
            }
        });
    });

    if (!targetQuiz) {
        showMessage('Quiz not found', 'error');
        return;
    }

    selectedQuizForTaking = targetQuiz;
    currentQuizData = targetQuiz.questions;
    currentQuestionIndex = 0;
    optionSubmitted = false;
    awaitingNextConfirmation = false;

    // Switch to take quiz tab
    switchTab('take-quiz');

    // Start the quiz
    startQuiz();
}

// Check if student has attempted a quiz
function hasStudentAttempted(username, quizId) {
    return quizResults[username] && quizResults[username][quizId];
}

// Get number of quiz attempts
function getQuizAttempts(quizId) {
    let count = 0;
    Object.values(quizResults).forEach(userResults => {
        if (userResults[quizId]) {
            count++;
        }
    });
    return count;
}

// Start the quiz
function startQuiz() {
    if (!currentQuizData || currentQuizData.length === 0) {
        showMessage('No quiz selected', 'error');
        return;
    }

    // Reset quiz state
    optionSubmitted = false;
    awaitingNextConfirmation = false;

    // Start listening for voice commands
    startListening();

    // Display the first question
    displayQuestion();
}

// Display current question
function displayQuestion() {
    const currentQuestion = currentQuizData[currentQuestionIndex];
    document.getElementById('quiz-question').textContent = currentQuestion.question;

    const options = document.querySelectorAll('.option-item');

    options[0].querySelector('.option-text').textContent = currentQuestion.options[0];
    options[1].querySelector('.option-text').textContent = currentQuestion.options[1];
    options[2].querySelector('.option-text').textContent = currentQuestion.options[2];
    options[3].querySelector('.option-text').textContent = currentQuestion.options[3];

    // Reset selected state
    options.forEach(option => {
        option.classList.remove('selected');
        option.style.display = 'flex';
    });

    // Update progress bar
    document.getElementById('quiz-progress').style.width =
        ((currentQuestionIndex + 1) / currentQuizData.length * 100) + '%';

    // Hide feedback
    document.getElementById('quiz-feedback').style.display = 'none';

    // Reset option submission flag
    optionSubmitted = false;

    // Speak the question and options
    setTimeout(() => {
        speakText('Question ' + (currentQuestionIndex + 1) + ' of ' + currentQuizData.length + ': ' + currentQuestion.question);
        setTimeout(() => {
            speakOptions();
        }, 2000);
    }, 500);
}

// Select an option
function selectOption(letter) {
    if (optionSubmitted) {
        speakText('An option has already been submitted. You cannot change your answer.');
        return;
    }

    // Highlight the selected option
    document.querySelectorAll('.option-item').forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-option') === letter) {
            option.classList.add('selected');
        }
    });

    // Check if the answer is correct
    const currentQuestion = currentQuizData[currentQuestionIndex];
    const isCorrect = letter === currentQuestion.correctAnswer;

    // Store answer for results
    if (!selectedQuizForTaking.userAnswers) {
        selectedQuizForTaking.userAnswers = [];
    }
    selectedQuizForTaking.userAnswers[currentQuestionIndex] = {
        selected: letter,
        correct: isCorrect
    };

    // Provide feedback
    const feedbackElement = document.getElementById('quiz-feedback');

    if (isCorrect) {
        feedbackElement.textContent = 'Correct! Do you want to proceed to the next question? Say yes or no.';
        feedbackElement.className = 'feedback-correct';
        speakText('Correct! Do you want to proceed to the next question? Say yes or no.');
    } else {
        feedbackElement.textContent = 'Incorrect. The correct answer is option ' + currentQuestion.correctAnswer + '. Do you want to proceed to the next question? Say yes or no.';
        feedbackElement.className = 'feedback-incorrect';
        speakText('Incorrect. The correct answer is option ' + currentQuestion.correctAnswer + '. Do you want to proceed to the next question? Say yes or no.');
    }

    feedbackElement.style.display = 'block';
    awaitingNextConfirmation = true;
    optionSubmitted = true;
}

// Go to next question
function goToNextQuestion() {
    currentQuestionIndex++;
    optionSubmitted = false;
    awaitingNextConfirmation = false;

    if (currentQuestionIndex < currentQuizData.length) {
        displayQuestion();
    } else {
        // Quiz completed
        completeQuiz();
    }
}

// Complete the quiz
function completeQuiz() {
    // Calculate score
    let correctAnswers = 0;
    selectedQuizForTaking.userAnswers.forEach(answer => {
        if (answer.correct) correctAnswers++;
    });

    const totalQuestions = currentQuizData.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    // Save results
    if (!quizResults[currentUser.username]) {
        quizResults[currentUser.username] = {};
    }

    quizResults[currentUser.username][selectedQuizForTaking.id] = {
        quizTitle: selectedQuizForTaking.title,
        score: correctAnswers,
        total: totalQuestions,
        percentage: percentage,
        answers: selectedQuizForTaking.userAnswers,
        completedAt: new Date().toISOString(),
        quizId: selectedQuizForTaking.id
    };

    // Display completion message
    document.getElementById('quiz-question').textContent =
        `Quiz completed! You scored ${correctAnswers} out of ${totalQuestions} (${percentage}%)`;

    document.querySelectorAll('.option-item').forEach(option => {
        option.style.display = 'none';
    });

    // Hide feedback
    document.getElementById('quiz-feedback').style.display = 'none';

    speakText(`Quiz completed! You scored ${correctAnswers} out of ${totalQuestions} questions correctly. Your percentage is ${percentage} percent.`);
    stopListening();
}

// Load quiz results for teacher
function loadQuizResults() {
    const container = document.getElementById('results-container');
    const teacherQuizzes = quizzes[currentUser.username] || {};

    if (Object.keys(teacherQuizzes).length === 0) {
        container.innerHTML = `
                    <div class="message info">
                        <i class="fas fa-info-circle"></i> No quizzes created yet. Create quizzes first to view results.
                    </div>
                `;
        return;
    }

    let resultsHTML = '';
    Object.values(teacherQuizzes).forEach(quiz => {
        const quizAttempts = getQuizResultsForTeacher(quiz.id);

        resultsHTML += `
                    <div class="quiz-item">
                        <div class="quiz-header">
                            <div>
                                <div class="quiz-title">${quiz.title}</div>
                                <div class="quiz-meta">
                                    <div><i class="fas fa-users"></i> ${quizAttempts.length} student attempts</div>
                                    <div><i class="fas fa-chart-line"></i> Average Score: ${calculateAverageScore(quizAttempts)}%</div>
                                </div>
                            </div>
                        </div>
                `;

        if (quizAttempts.length > 0) {
            resultsHTML += '<div style="margin-top: 15px;"><h4>Student Results:</h4>';
            quizAttempts.forEach(attempt => {
                resultsHTML += `
                            <div class="question-card">
                                <div class="question-text">
                                    <strong>${attempt.studentName}</strong> - 
                                    Score: ${attempt.score}/${attempt.total} (${attempt.percentage}%)
                                </div>
                                <div style="font-size: 0.9rem; color: #666;">
                                    Completed: ${new Date(attempt.completedAt).toLocaleDateString()}
                                </div>
                            </div>
                        `;
            });
            resultsHTML += '</div>';
        } else {
            resultsHTML += '<div class="message info" style="margin-top: 15px;">No student attempts yet.</div>';
        }

        resultsHTML += '</div>';
    });

    container.innerHTML = resultsHTML;
}

// Load student results
function loadStudentResults() {
    const container = document.getElementById('student-results-container');
    const studentResults = quizResults[currentUser.username] || {};

    if (Object.keys(studentResults).length === 0) {
        container.innerHTML = `
                    <div class="message info">
                        <i class="fas fa-info-circle"></i> You haven't completed any quizzes yet. Visit the "Available Quizzes" tab to get started.
                    </div>
                `;
        return;
    }

    let resultsHTML = '';
    Object.values(studentResults).forEach(result => {
        const gradeClass = result.percentage >= 80 ? 'success' : result.percentage >= 60 ? 'warning' : 'danger';

        resultsHTML += `
                    <div class="quiz-item">
                        <div class="quiz-header">
                            <div>
                                <div class="quiz-title">${result.quizTitle}</div>
                                <div class="quiz-meta">
                                    <div style="color: var(--${gradeClass});">
                                        <i class="fas fa-trophy"></i> Score: ${result.score}/${result.total} (${result.percentage}%)
                                    </div>
                                    <div><i class="fas fa-calendar"></i> Completed: ${new Date(result.completedAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div class="quiz-actions">
                                <button class="btn btn-secondary" onclick="viewDetailedResults('${result.quizId}')">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    });

    container.innerHTML = resultsHTML;
}

// Get quiz results for teacher
function getQuizResultsForTeacher(quizId) {
    const results = [];
    Object.keys(quizResults).forEach(username => {
        if (quizResults[username][quizId]) {
            results.push({
                ...quizResults[username][quizId],
                studentName: username
            });
        }
    });
    return results;
}

// Calculate average score
function calculateAverageScore(attempts) {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, attempt) => acc + attempt.percentage, 0);
    return Math.round(sum / attempts.length);
}

// View detailed results
function viewDetailedResults(quizId) {
    const result = quizResults[currentUser.username][quizId];
    if (!result) return;

    // Find the original quiz
    let originalQuiz = null;
    Object.values(quizzes).forEach(teacherQuizzes => {
        Object.values(teacherQuizzes).forEach(quiz => {
            if (quiz.id === quizId) {
                originalQuiz = quiz;
            }
        });
    });

    if (!originalQuiz) return;

    let detailsHTML = `
                <div class="quiz-item">
                    <div class="quiz-header">
                        <div>
                            <div class="quiz-title">${result.quizTitle} - Detailed Results</div>
                            <div class="quiz-meta">
                                <div>Final Score: ${result.score}/${result.total} (${result.percentage}%)</div>
                                <div>Completed: ${new Date(result.completedAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <h4>Question by Question Review:</h4>
            `;

    result.answers.forEach((answer, index) => {
        const question = originalQuiz.questions[index];
        const isCorrect = answer.correct;

        detailsHTML += `
                    <div class="question-card" style="border-left: 4px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
                        <div class="question-text">
                            Q${index + 1}: ${question.question}
                        </div>
                        <div style="margin-top: 10px;">
                            <div>Your answer: <strong>Option ${answer.selected}</strong> - ${question.options[answer.selected.charCodeAt(0) - 65]}</div>
                            <div style="color: var(--success);">Correct answer: <strong>Option ${question.correctAnswer}</strong> - ${question.options[question.correctAnswer.charCodeAt(0) - 65]}</div>
                            <div style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}; font-weight: 600; margin-top: 5px;">
                                ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </div>
                        </div>
                    </div>
                `;
    });

    detailsHTML += `
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn btn-secondary" onclick="loadStudentResults()">
                            <i class="fas fa-arrow-left"></i> Back to Results
                        </button>
                    </div>
                </div>
            `;

    document.getElementById('student-results-container').innerHTML = detailsHTML;
}

// View quiz details (for teachers)
function viewQuizDetails(quizId) {
    const teacherQuizzes = quizzes[currentUser.username] || {};
    let targetQuiz = null;

    Object.values(teacherQuizzes).forEach(quiz => {
        if (quiz.id === quizId) {
            targetQuiz = quiz;
        }
    });

    if (!targetQuiz) return;

    showQuizPreview(targetQuiz.title, targetQuiz.description, targetQuiz.questions);
    switchTab('create-quiz');
}

// Edit quiz (placeholder - would require more complex implementation)
function editQuiz(quizId) {
    showMessage('Edit functionality coming soon!', 'info');
    speakText('Edit functionality is not yet available');
}

// Delete quiz
function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        return;
    }

    const teacherQuizzes = quizzes[currentUser.username] || {};
    let deletedTitle = '';

    Object.keys(teacherQuizzes).forEach(title => {
        if (teacherQuizzes[title].id === quizId) {
            deletedTitle = title;
            delete teacherQuizzes[title];
        }
    });

    // Also remove any student results for this quiz
    Object.keys(quizResults).forEach(username => {
        if (quizResults[username][quizId]) {
            delete quizResults[username][quizId];
        }
    });

    showMessage(`Quiz "${deletedTitle}" has been deleted successfully.`, 'success');
    speakText(`Quiz "${deletedTitle}" has been deleted`);
    loadTeacherQuizzes();
}

// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            processVoiceCommand(transcript);
            document.getElementById('listening-indicator').style.display = 'none';
        };

        recognition.onend = function () {
            if (isListening) {
                setTimeout(() => recognition.start(), 100);
            }
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error', event.error);
            document.getElementById('listening-indicator').style.display = 'none';

            // Restart recognition if it was listening
            if (isListening && event.error !== 'aborted') {
                setTimeout(() => recognition.start(), 1000);
            }
        };
    } else {
        console.warn('Speech recognition is not supported in this browser');
    }
}

// Process voice commands
function processVoiceCommand(command) {
    console.log('Voice command:', command);

    if (command.includes('repeat question')) {
        speakText(document.getElementById('quiz-question').textContent);
    }
    else if (command.includes('repeat options')) {
        speakOptions();
    }
    else if (!optionSubmitted) {
        if (command.includes('option a') || command.match(/\ba\b/)) {
            selectOption('A');
        }
        else if (command.includes('option b') || command.match(/\bb\b/)) {
            selectOption('B');
        }
        else if (command.includes('option c') || command.match(/\bc\b/)) {
            selectOption('C');
        }
        else if (command.includes('option d') || command.match(/\bd\b/)) {
            selectOption('D');
        }
    }

    if (awaitingNextConfirmation && (command.includes('yes') || command.match(/\byes\b/))) {
        awaitingNextConfirmation = false;
        goToNextQuestion();
    }
    else if (awaitingNextConfirmation && (command.includes('no') || command.match(/\bno\b/))) {
        awaitingNextConfirmation = false;
        speakText('Staying on current question. Say "repeat question" or "repeat options" if needed.');
    }
}

// Text-to-speech function
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.volume = 1.0;
        utterance.pitch = 1.0;

        // Use a more natural voice if available
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

// Speak all options
function speakOptions() {
    const options = document.querySelectorAll('.option-item');
    let optionsText = 'The options are: ';

    options.forEach(option => {
        const letter = option.getAttribute('data-option');
        const text = option.querySelector('.option-text').textContent;
        optionsText += 'Option ' + letter + ': ' + text + '. ';
    });

    speakText(optionsText);
}

// Start listening for voice commands
function startListening() {
    if (recognition && currentUser && currentUser.role === 'student') {
        isListening = true;
        document.getElementById('listening-indicator').style.display = 'flex';
        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            document.getElementById('listening-indicator').style.display = 'none';
        }
    }
}

// Stop listening
function stopListening() {
    if (recognition) {
        isListening = false;
        document.getElementById('listening-indicator').style.display = 'none';
        recognition.stop();
    }
}

// Initialize the application when page loads
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

// Add some sample data for demonstration
setTimeout(() => {
    // Add sample teacher and student
    users['demo_teacher'] = {
        username: 'demo_teacher',
        password: 'demo123',
        role: 'teacher',
        email: 'teacher@demo.com'
    };
    users['demo_student'] = {
        username: 'demo_student',
        password: 'demo123',
        role: 'student',
        email: 'student@demo.com'
    };

    // Add sample quiz
    quizzes['demo_teacher'] = {
        'Sample Math Quiz': {
            title: 'Sample Math Quiz',
            description: 'Basic arithmetic questions for practice',
            questions: [
                {
                    question: 'What is 2 + 2?',
                    options: ['3', '4', '5', '6'],
                    correctAnswer: 'B'
                },
                {
                    question: 'What is 5 × 3?',
                    options: ['12', '15', '18', '20'],
                    correctAnswer: 'B'
                }
            ],
            createdBy: 'demo_teacher',
            createdAt: new Date().toISOString(),
            id: 'demo_quiz_1'
        }
    };

    // Add sample result
    quizResults['demo_student'] = {
        'demo_quiz_1': {
            quizTitle: 'Sample Math Quiz',
            score: 2,
            total: 2,
            percentage: 100,
            answers: [
                { selected: 'B', correct: true },
                { selected: 'B', correct: true }
            ],
            completedAt: new Date().toISOString(),
            quizId: 'demo_quiz_1'
        }
    };
}, 1000);