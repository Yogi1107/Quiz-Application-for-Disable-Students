let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let recognition = null;
let isListening = false;
let awaitingNextConfirmation = false;
let optionSubmitted = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initSpeechRecognition();
    
    // Load quizzes when available quizzes tab is shown
    document.querySelector('a[href="#available-quizzes"]').addEventListener('shown.bs.tab', loadAvailableQuizzes);
    
    // Load results when results tab is shown
    document.querySelector('a[href="#my-results"]').addEventListener('shown.bs.tab', loadStudentResults);
    
    // Stop listening when leaving take quiz tab
    document.querySelector('a[href="#take-quiz"]').addEventListener('hidden.bs.tab', stopListening);
    
    // Load initial quizzes
    loadAvailableQuizzes();
    
    speakText('Student dashboard loaded. You can browse available quizzes, take quizzes, and view your results.');
});

// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            processVoiceCommand(transcript);
            document.getElementById('listening-indicator').style.display = 'none';
        };
        
        recognition.onend = function() {
            if (isListening) {
                setTimeout(() => recognition.start(), 100);
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            document.getElementById('listening-indicator').style.display = 'none';
            
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
        const questionText = document.getElementById('quiz-content').querySelector('h4')?.textContent;
        if (questionText) speakText(questionText);
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

// Speak all options
function speakOptions() {
    const options = document.querySelectorAll('.option-btn');
    if (options.length === 0) return;
    
    let optionsText = 'The options are: ';
    options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const text = option.textContent.replace(letter + '.', '').trim();
        optionsText += `Option ${letter}: ${text}. `;
    });
    
    speakText(optionsText);
}

// Start listening
function startListening() {
    if (recognition) {
        isListening = true;
        document.getElementById('listening-indicator').style.display = 'block';
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

// Load available quizzes
async function loadAvailableQuizzes() {
    try {
        const data = await fetchAPI('/api/quizzes');
        const container = document.getElementById('student-quiz-list');
        
        if (data.quizzes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No quizzes are currently available. 
                    Please check back later.
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.quizzes.map(quiz => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="text-primary">${quiz.title}</h5>
                            <p class="text-muted mb-1">${quiz.description}</p>
                            <small class="text-muted">
                                <i class="fas fa-question-circle"></i> ${quiz.question_count} questions | 
                                <i class="fas fa-user-tie"></i> Created by: ${quiz.created_by} | 
                                <i class="fas fa-calendar"></i> ${formatDate(quiz.created_at)}
                            </small>
                            ${quiz.has_attempted ? '<div class="badge bg-success mt-2"><i class="fas fa-check-circle"></i> Completed</div>' : ''}
                        </div>
                        <div>
                            <button class="btn btn-primary" onclick="startQuiz(${quiz.id})">
                                <i class="fas fa-play"></i> ${quiz.has_attempted ? 'Retake' : 'Start'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

// Start quiz
async function startQuiz(quizId) {
    try {
        const data = await fetchAPI(`/api/quizzes/${quizId}`);
        currentQuiz = data.quiz;
        currentQuestionIndex = 0;
        userAnswers = [];
        optionSubmitted = false;
        awaitingNextConfirmation = false;
        
        // Switch to take quiz tab
        const takeQuizTab = new bootstrap.Tab(document.querySelector('a[href="#take-quiz"]'));
        takeQuizTab.show();
        
        document.getElementById('quiz-title-header').textContent = currentQuiz.title;
        
        // Start listening
        startListening();
        
        // Display first question
        displayQuestion();
        
    } catch (error) {
        console.error('Error starting quiz:', error);
    }
}

// Display question
function displayQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    const container = document.getElementById('quiz-content');
    
    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    const progressBar = document.getElementById('quiz-progress');
    progressBar.style.width = progress + '%';
    progressBar.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
    
    // Display question and options
    container.innerHTML = `
        <h4 class="mb-4">${question.question}</h4>
        <div class="d-grid gap-2">
            ${question.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index);
                return `
                    <button class="btn btn-outline-primary text-start option-btn" onclick="selectOption('${letter}')">
                        <strong>${letter}.</strong> ${option}
                    </button>
                `;
            }).join('')}
        </div>
        <div id="feedback" class="mt-3"></div>
    `;
    
    optionSubmitted = false;
    awaitingNextConfirmation = false;
    
    // Speak question and options
    setTimeout(() => {
        speakText(`Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}: ${question.question}`);
        setTimeout(() => {
            speakOptions();
        }, 2000);
    }, 500);
}

// Select option
function selectOption(letter) {
    if (optionSubmitted) {
        speakText('An option has already been submitted. You cannot change your answer.');
        return;
    }
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = letter === question.correctAnswer;
    
    // Store answer
    userAnswers[currentQuestionIndex] = letter;
    
    // Highlight selected option
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('btn-outline-primary', 'btn-success', 'btn-danger');
        const btnLetter = btn.querySelector('strong').textContent.replace('.', '');
        
        if (btnLetter === letter) {
            btn.classList.add(isCorrect ? 'btn-success' : 'btn-danger');
        } else {
            btn.classList.add('btn-outline-secondary');
        }
        
        btn.disabled = true;
    });
    
    // Show feedback
    const feedback = document.getElementById('feedback');
    
    if (isCorrect) {
        feedback.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> Correct! 
                Do you want to proceed to the next question? Say yes or no.
            </div>
        `;
        speakText('Correct! Do you want to proceed to the next question? Say yes or no.');
    } else {
        feedback.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-times-circle"></i> Incorrect. The correct answer is option ${question.correctAnswer}. 
                Do you want to proceed to the next question? Say yes or no.
            </div>
        `;
        speakText(`Incorrect. The correct answer is option ${question.correctAnswer}. Do you want to proceed to the next question? Say yes or no.`);
    }
    
    // Add next button
    feedback.innerHTML += `
        <button class="btn btn-primary mt-2" onclick="goToNextQuestion()">
            <i class="fas fa-arrow-right"></i> Next Question
        </button>
    `;
    
    optionSubmitted = true;
    awaitingNextConfirmation = true;
}

// Go to next question
function goToNextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < currentQuiz.questions.length) {
        displayQuestion();
    } else {
        completeQuiz();
    }
}

// Complete quiz
async function completeQuiz() {
    stopListening();
    
    try {
        const data = await fetchAPI(`/api/quizzes/${currentQuiz.id}/submit`, {
            method: 'POST',
            body: JSON.stringify({ answers: userAnswers })
        });
        
        const container = document.getElementById('quiz-content');
        const gradeClass = data.percentage >= 80 ? 'success' : data.percentage >= 60 ? 'warning' : 'danger';
        
        container.innerHTML = `
            <div class="alert alert-${gradeClass} text-center">
                <h3><i class="fas fa-trophy"></i> Quiz Completed!</h3>
                <h1 class="display-4">${data.score}/${data.total}</h1>
                <p class="lead">${data.percentage.toFixed(1)}%</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Take Another Quiz
                </button>
            </div>
            
            <div class="card mt-3">
                <div class="card-header">
                    <h5>Detailed Results</h5>
                </div>
                <div class="card-body">
                    ${data.answers.map((answer, index) => {
                        const question = currentQuiz.questions[index];
                        return `
                            <div class="mb-3 pb-3 border-bottom">
                                <h6>Q${index + 1}: ${question.question}</h6>
                                <p class="mb-1">
                                    Your answer: <span class="${answer.is_correct ? 'text-success' : 'text-danger'}">
                                        Option ${answer.selected} - ${question.options[answer.selected.charCodeAt(0) - 65]}
                                    </span>
                                </p>
                                <p class="mb-1">
                                    Correct answer: <span class="text-success">
                                        Option ${answer.correct} - ${question.options[answer.correct.charCodeAt(0) - 65]}
                                    </span>
                                </p>
                                <span class="badge bg-${answer.is_correct ? 'success' : 'danger'}">
                                    ${answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('quiz-progress').style.width = '100%';
        document.getElementById('quiz-progress').textContent = 'Completed';
        
        showToast(`Quiz completed! You scored ${data.percentage.toFixed(1)}%`, 'success');
        speakText(`Quiz completed! You scored ${data.score} out of ${data.total} questions correctly. Your percentage is ${data.percentage.toFixed(1)} percent.`);
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
    }
}

// Load student results
async function loadStudentResults() {
    try {
        const data = await fetchAPI('/api/results');
        const container = document.getElementById('student-results-container');
        
        if (data.results.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> You haven't completed any quizzes yet. 
                    Visit the "Available Quizzes" tab to get started.
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.results.map(result => {
            const gradeClass = result.percentage >= 80 ? 'success' : result.percentage >= 60 ? 'warning' : 'danger';
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="text-primary">${result.quiz_title}</h5>
                                <p class="mb-1">
                                    <span class="badge bg-${gradeClass}">
                                        ${result.score}/${result.total} (${result.percentage.toFixed(1)}%)
                                    </span>
                                </p>
                                <small class="text-muted">
                                    <i class="fas fa-calendar"></i> Completed: ${formatDate(result.completed_at)}
                                </small>
                            </div>
                            <button class="btn btn-sm btn-info" onclick='viewDetailedResults(${JSON.stringify(result)})'>
                                <i class="fas fa-eye"></i> Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

// View detailed results
function viewDetailedResults(result) {
    // Create modal to show detailed results
    const modalHTML = `
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${result.quiz_title} - Detailed Results</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-${result.percentage >= 80 ? 'success' : result.percentage >= 60 ? 'warning' : 'danger'}">
                            <h4>Final Score: ${result.score}/${result.total} (${result.percentage.toFixed(1)}%)</h4>
                        </div>
                        <hr>
                        ${result.answers.map((answer, index) => `
                            <div class="mb-3">
                                <h6 class="${answer.is_correct ? 'text-success' : 'text-danger'}">
                                    Question ${index + 1} ${answer.is_correct ? '✓' : '✗'}
                                </h6>
                                <p class="mb-1">Your answer: Option ${answer.selected}</p>
                                <p class="text-success mb-0">Correct answer: Option ${answer.correct}</p>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalElement = document.body.lastElementChild;
    const bsModal = new bootstrap.Modal(modalElement);
    bsModal.show();
    
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });
}