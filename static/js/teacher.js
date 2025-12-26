let questionCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    addQuestionForm();
    setupQuizForm();
    setupAddQuestionButton();
    
    // Load quizzes when manage tab is shown
    document.querySelector('a[href="#manage-quizzes"]').addEventListener('shown.bs.tab', loadTeacherQuizzes);
    
    // Load results when results tab is shown
    document.querySelector('a[href="#view-results"]').addEventListener('shown.bs.tab', loadResults);
    
    speakText('Teacher dashboard loaded. You can create quizzes, manage existing quizzes, and view student results.');
});

// Setup quiz form submission
function setupQuizForm() {
    const form = document.getElementById('quiz-form');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveQuiz();
    });
}

// Setup add question button
function setupAddQuestionButton() {
    document.getElementById('add-question-btn').addEventListener('click', function() {
        addQuestionForm();
        speakText('New question added. Question ' + questionCount);
    });
}

// Add question form
function addQuestionForm() {
    questionCount++;
    const container = document.getElementById('questions-container');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-form-group card mb-3';
    questionDiv.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Question ${questionCount}</h5>
            ${questionCount > 1 ? `<button type="button" class="btn btn-sm btn-danger" onclick="removeQuestion(this)">
                <i class="fas fa-trash"></i>
            </button>` : ''}
        </div>
        <div class="card-body">
            <div class="mb-3">
                <label class="form-label">Question Text</label>
                <input type="text" class="form-control question-text" required>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6 mb-2">
                    <label class="form-label">Option A</label>
                    <input type="text" class="form-control option-a" required>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Option B</label>
                    <input type="text" class="form-control option-b" required>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Option C</label>
                    <input type="text" class="form-control option-c" required>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Option D</label>
                    <input type="text" class="form-control option-d" required>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Correct Answer</label>
                <select class="form-select correct-answer" required>
                    <option value="">Select correct answer</option>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(questionDiv);
}

// Remove question
function removeQuestion(button) {
    button.closest('.question-form-group').remove();
    
    // Renumber questions
    const questions = document.querySelectorAll('.question-form-group');
    questionCount = questions.length;
    
    questions.forEach((q, index) => {
        q.querySelector('.card-header h5').textContent = `Question ${index + 1}`;
    });
    
    speakText('Question removed');
}

// Save quiz
async function saveQuiz() {
    const title = document.getElementById('quiz-title').value.trim();
    const description = document.getElementById('quiz-description').value.trim();
    
    if (!validateQuizTitle(title)) {
        showToast('Quiz title must start with a letter or underscore and contain only letters, numbers, spaces, or underscores', 'error');
        speakText('Invalid quiz title format');
        return;
    }
    
    const questionForms = document.querySelectorAll('.question-form-group');
    const questions = [];
    
    for (let i = 0; i < questionForms.length; i++) {
        const form = questionForms[i];
        
        const questionText = form.querySelector('.question-text').value.trim();
        const optionA = form.querySelector('.option-a').value.trim();
        const optionB = form.querySelector('.option-b').value.trim();
        const optionC = form.querySelector('.option-c').value.trim();
        const optionD = form.querySelector('.option-d').value.trim();
        const correctAnswer = form.querySelector('.correct-answer').value;
        
        if (!validateUniqueOptions([optionA, optionB, optionC, optionD])) {
            showToast(`Question ${i + 1}: All options must be unique`, 'error');
            speakText(`Question ${i + 1}: All options must be unique`);
            return;
        }
        
        if (!correctAnswer) {
            showToast(`Question ${i + 1}: Please select the correct answer`, 'error');
            speakText(`Question ${i + 1}: Please select the correct answer`);
            return;
        }
        
        questions.push({
            question: questionText,
            options: [optionA, optionB, optionC, optionD],
            correctAnswer: correctAnswer
        });
    }
    
    try {
        const data = await fetchAPI('/api/quizzes', {
            method: 'POST',
            body: JSON.stringify({
                title: title,
                description: description,
                questions: questions
            })
        });
        
        showToast('Quiz saved successfully!', 'success');
        speakText(`Quiz "${title}" has been saved successfully with ${questions.length} questions.`);
        
        // Reset form
        document.getElementById('quiz-form').reset();
        document.getElementById('questions-container').innerHTML = '';
        questionCount = 0;
        addQuestionForm();
        
    } catch (error) {
        console.error('Error saving quiz:', error);
    }
}

// Load teacher's quizzes
async function loadTeacherQuizzes() {
    try {
        const data = await fetchAPI('/api/quizzes');
        const container = document.getElementById('teacher-quiz-list');
        
        if (data.quizzes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> You haven't created any quizzes yet. 
                    Use the "Create Quiz" tab to get started.
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.quizzes.map(quiz => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h5 class="text-primary">${quiz.title}</h5>
                            <p class="text-muted mb-1">${quiz.description}</p>
                            <small class="text-muted">
                                <i class="fas fa-question-circle"></i> ${quiz.question_count} questions | 
                                <i class="fas fa-users"></i> ${quiz.attempts} attempts | 
                                <i class="fas fa-calendar"></i> ${formatDate(quiz.created_at)}
                            </small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-info me-1" onclick="viewQuiz(${quiz.id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteQuiz(${quiz.id}, '${quiz.title}')">
                                <i class="fas fa-trash"></i> Delete
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

// View quiz details
async function viewQuiz(quizId) {
    try {
        const data = await fetchAPI(`/api/quizzes/${quizId}`);
        const quiz = data.quiz;
        
        const modal = new bootstrap.Modal(document.createElement('div'));
        const modalHTML = `
            <div class="modal fade" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${quiz.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted">${quiz.description}</p>
                            <hr>
                            ${quiz.questions.map((q, index) => `
                                <div class="mb-3">
                                    <h6>Q${index + 1}: ${q.question}</h6>
                                    <ul class="list-unstyled ms-3">
                                        <li ${q.correctAnswer === 'A' ? 'class="text-success fw-bold"' : ''}>
                                            A: ${q.options[0]} ${q.correctAnswer === 'A' ? '✓' : ''}
                                        </li>
                                        <li ${q.correctAnswer === 'B' ? 'class="text-success fw-bold"' : ''}>
                                            B: ${q.options[1]} ${q.correctAnswer === 'B' ? '✓' : ''}
                                        </li>
                                        <li ${q.correctAnswer === 'C' ? 'class="text-success fw-bold"' : ''}>
                                            C: ${q.options[2]} ${q.correctAnswer === 'C' ? '✓' : ''}
                                        </li>
                                        <li ${q.correctAnswer === 'D' ? 'class="text-success fw-bold"' : ''}>
                                            D: ${q.options[3]} ${q.correctAnswer === 'D' ? '✓' : ''}
                                        </li>
                                    </ul>
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
        
    } catch (error) {
        console.error('Error viewing quiz:', error);
    }
}

// Delete quiz
async function deleteQuiz(quizId, quizTitle) {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await fetchAPI(`/api/quizzes/${quizId}`, {
            method: 'DELETE'
        });
        
        showToast(`Quiz "${quizTitle}" has been deleted successfully`, 'success');
        speakText(`Quiz "${quizTitle}" has been deleted`);
        
        loadTeacherQuizzes();
    } catch (error) {
        console.error('Error deleting quiz:', error);
    }
}

// Load results
async function loadResults() {
    try {
        const data = await fetchAPI('/api/results');
        const container = document.getElementById('results-container');
        
        if (data.results.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No student results yet.
                </div>
            `;
            return;
        }
        
        // Group results by quiz
        const resultsByQuiz = {};
        data.results.forEach(result => {
            if (!resultsByQuiz[result.quiz_title]) {
                resultsByQuiz[result.quiz_title] = [];
            }
            resultsByQuiz[result.quiz_title].push(result);
        });
        
        container.innerHTML = Object.entries(resultsByQuiz).map(([quizTitle, results]) => {
            const avgScore = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
            
            return `
                <div class="card mb-3">
                    <div class="card-header">
                        <h5>${quizTitle}</h5>
                        <small class="text-muted">
                            <i class="fas fa-users"></i> ${results.length} attempts | 
                            <i class="fas fa-chart-line"></i> Average: ${avgScore.toFixed(1)}%
                        </small>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Score</th>
                                        <th>Percentage</th>
                                        <th>Completed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${results.map(r => `
                                        <tr>
                                            <td>${r.student_name}</td>
                                            <td>${r.score}/${r.total}</td>
                                            <td>
                                                <span class="badge ${r.percentage >= 80 ? 'bg-success' : r.percentage >= 60 ? 'bg-warning' : 'bg-danger'}">
                                                    ${r.percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td>${formatDate(r.completed_at)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading results:', error);
    }
}