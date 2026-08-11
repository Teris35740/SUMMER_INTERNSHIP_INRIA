/* ==============================
   MedSim — Frontend Logic
   ============================== */

// ── DOM References ──
const chatHistory = document.getElementById('chat-history');
const questionInput = document.getElementById('question-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const diagnoseBtn = document.getElementById('diagnose-btn');
const clinicalStateContainer = document.getElementById('clinical-state-container');
const jsonContainer = document.getElementById('json-container');
const internalsPlaceholder = document.getElementById('internals-placeholder');
const accordionsContainer = document.getElementById('accordions-container');
const loadingSteps = document.getElementById('loading-steps');
const stepsList = document.getElementById('steps-list');
const pipelinePanel = document.getElementById('pipeline-panel');
const appLayout = document.querySelector('.app-layout');
const togglePipelineBtn = document.getElementById('toggle-pipeline-btn');
const closePipelineBtn = document.getElementById('close-pipeline-btn');
const clinicalBar = document.getElementById('clinical-bar');
const clinicalBarToggle = document.getElementById('clinical-bar-toggle');
const statusIndicator = document.getElementById('status-indicator');
const statusText = statusIndicator.querySelector('.status-text');
const questionCounterEl = document.getElementById('question-counter');
const patientSelect = document.getElementById('patient-select');
const patientBadge = document.getElementById('patient-badge');

// Modal
const diagnosisModal = document.getElementById('diagnosis-modal');
const diagnosisInput = document.getElementById('diagnosis-input');
const submitDiagnosisBtn = document.getElementById('submit-diagnosis-btn');
const cancelDiagnosisBtn = document.getElementById('cancel-diagnosis-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// ── State ──
const sessionId = "session_1";
let questionCount = 0;
let currentPatientNum = 1;
let patientsData = [];
let isPedagoMode = false;

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    loadPatients();
    setupEventListeners();
    autoResizeTextarea();
});

// ==============================
// PATIENT SELECTOR
// ==============================

async function loadPatients() {
    try {
        const res = await fetch('/api/patients');
        if (!res.ok) throw new Error('Failed to load patients');
        patientsData = await res.json();
        
        patientSelect.innerHTML = '';
        patientsData.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.num;
            const label = `#${String(p.num).padStart(2, '0')} — ${p.chief_complaint || 'Patient'}`;
            opt.textContent = label;
            if (p.num === currentPatientNum) opt.selected = true;
            patientSelect.appendChild(opt);
        });
        
        updatePatientBadge();
    } catch (e) {
        console.error('Error loading patients:', e);
        patientSelect.innerHTML = '<option value="1">Patient #01</option>';
    }
}

function updatePatientBadge() {
    const patient = patientsData.find(p => p.num === currentPatientNum);
    if (!patient) {
        patientBadge.textContent = '';
        patientBadge.className = 'patient-badge';
        return;
    }
    
    const diff = (patient.difficulty || '').toLowerCase();
    patientBadge.textContent = patient.specialty || '';
    patientBadge.className = 'patient-badge';
    if (diff === 'easy' || diff === 'facile') patientBadge.classList.add('easy');
    else if (diff === 'medium' || diff === 'moyen') patientBadge.classList.add('medium');
    else if (diff === 'hard' || diff === 'difficile') patientBadge.classList.add('hard');
}

// ==============================
// EVENT LISTENERS
// ==============================

function setupEventListeners() {
    // Send
    sendBtn.addEventListener('click', sendMessage);
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Clear
    clearBtn.addEventListener('click', clearSession);
    
    // Patient selector
    patientSelect.addEventListener('change', () => {
        currentPatientNum = parseInt(patientSelect.value, 10);
        updatePatientBadge();
        clearSession();
    });
    
    // Pipeline toggle
    togglePipelineBtn.addEventListener('click', togglePipeline);
    closePipelineBtn.addEventListener('click', togglePipeline);
    
    // Clinical bar toggle
    clinicalBarToggle.addEventListener('click', () => {
        clinicalBar.classList.toggle('collapsed');
    });
    
    // Accordions
    document.querySelectorAll('.accordion-header').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('active'));
    });
    
    // Diagnose button → open modal
    diagnoseBtn.addEventListener('click', openDiagnosisModal);
    
    // Modal
    closeModalBtn.addEventListener('click', closeDiagnosisModal);
    cancelDiagnosisBtn.addEventListener('click', closeDiagnosisModal);
    submitDiagnosisBtn.addEventListener('click', handleDiagnosisSubmit);
    diagnosisInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleDiagnosisSubmit();
        }
    });
    diagnosisModal.addEventListener('click', (e) => {
        if (e.target === diagnosisModal) closeDiagnosisModal();
    });
    
    // Mode Selection
    document.getElementById('mode-pedago-btn').addEventListener('click', () => {
        isPedagoMode = true;
        document.getElementById('current-mode-label').textContent = 'Pédagogique';
        document.getElementById('mode-selection-overlay').classList.add('hidden');
    });
    document.getElementById('mode-notation-btn').addEventListener('click', () => {
        isPedagoMode = false;
        document.getElementById('current-mode-label').textContent = 'Notation';
        document.getElementById('mode-selection-overlay').classList.add('hidden');
    });
    
    // Change Mode
    document.getElementById('change-mode-btn').addEventListener('click', () => {
        document.getElementById('mode-selection-overlay').classList.remove('hidden');
    });
}

// ==============================
// TEXTAREA AUTO-RESIZE
// ==============================

function autoResizeTextarea() {
    questionInput.addEventListener('input', () => {
        questionInput.style.height = 'auto';
        questionInput.style.height = Math.min(questionInput.scrollHeight, 160) + 'px';
    });
}

// ==============================
// PIPELINE PANEL
// ==============================

function togglePipeline() {
    appLayout.classList.toggle('pipeline-open');
    togglePipelineBtn.classList.toggle('active');
}

// ==============================
// STATUS
// ==============================

function setStatus(state, text) {
    statusIndicator.className = 'status-indicator';
    if (state === 'busy') statusIndicator.classList.add('busy');
    if (state === 'error') statusIndicator.classList.add('error');
    statusText.textContent = text || (state === 'busy' ? 'Traitement...' : state === 'error' ? 'Erreur' : 'Prêt');
}

// ==============================
// MESSAGES
// ==============================

function appendMessage(text, sender) {
    const row = document.createElement('div');
    row.classList.add('message-row', `${sender}-row`);
    
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'user') {
        row.innerHTML = `
            <div class="message-avatar">👨‍⚕️</div>
            <div>
                <div class="message-bubble">${escapeHtml(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    } else if (sender === 'assistant') {
        row.innerHTML = `
            <div class="message-avatar">🧑‍🦲</div>
            <div>
                <div class="message-bubble">${formatMarkdown(escapeHtml(text))}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    }
    
    chatHistory.appendChild(row);
    scrollToBottom();
}

function appendSystemMessage(text) {
    const row = document.createElement('div');
    row.classList.add('message-row', 'system-row');
    row.innerHTML = `
        <div class="message system-message">
            <div class="system-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <span>${text}</span>
        </div>
    `;
    chatHistory.appendChild(row);
    scrollToBottom();
}

function appendPedagogicalFeedback(evaluation, synthesis) {
    if (!evaluation) return;
    
    const row = document.createElement('div');
    row.classList.add('message-row', 'assistant-row');
    
    let html = `
        <div class="message-avatar">🎓</div>
        <div style="width:100%">
            <div class="pedagogical-feedback-card">
                <div class="pedago-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                    <span>Évaluation Pédagogique</span>
                </div>
                
                <div class="pedago-section">
                    <h4>Pertinence de la question</h4>
                    <p><strong>${evaluation.is_pertinent ? 'Pertinent' : 'Non pertinent'}</strong> : ${escapeHtml(evaluation.feedback)}</p>
                </div>
    `;
    
    if (synthesis) {
        html += `
                <div class="pedago-section">
                    <h4>Revue de cours rapide</h4>
                    <p>${formatMarkdown(escapeHtml(synthesis))}</p>
                </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    row.innerHTML = html;
    chatHistory.appendChild(row);
    scrollToBottom();
}

function appendTypingIndicator(id) {
    const row = document.createElement('div');
    row.id = id;
    row.classList.add('message-row', 'assistant-row');
    row.innerHTML = `
        <div class="message-avatar">🧑‍🦲</div>
        <div>
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        </div>
    `;
    chatHistory.appendChild(row);
    scrollToBottom();
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    });
}

// ==============================
// TEXT UTILS
// ==============================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    // Bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ==============================
// TOAST NOTIFICATIONS
// ==============================

function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==============================
// LOADING STEPS (Pipeline)
// ==============================

const steps = [
    { id: 'step-analysis', text: 'Analyse de la question' },
    { id: 'step-motor', text: 'Filtrage (State Motor)' },
    { id: 'step-gen', text: 'Vérification' }
];

function simulateLoadingSteps() {
    stepsList.innerHTML = '';
    
    steps.forEach((step, i) => {
        const li = document.createElement('li');
        li.id = step.id;
        li.innerHTML = `<span class="step-icon">${i + 1}</span> ${step.text}`;
        stepsList.appendChild(li);
    });

    internalsPlaceholder.classList.add('hidden');
    accordionsContainer.classList.add('hidden');
    loadingSteps.classList.remove('hidden');

    let currentStepIdx = 0;
    
    return setInterval(() => {
        if (currentStepIdx < steps.length) {
            const currentLi = document.getElementById(steps[currentStepIdx].id);
            if (currentLi) currentLi.classList.add('active');
            
            if (currentStepIdx > 0) {
                const prevLi = document.getElementById(steps[currentStepIdx - 1].id);
                if (prevLi) {
                    prevLi.classList.remove('active');
                    prevLi.classList.add('done');
                    prevLi.querySelector('.step-icon').textContent = '✓';
                }
            }
            currentStepIdx++;
        }
    }, 800);
}

// ==============================
// SEND MESSAGE
// ==============================

async function sendMessage() {
    const question = questionInput.value.trim();
    if (!question) return;

    appendMessage(question, 'user');
    questionInput.value = '';
    questionInput.style.height = 'auto';

    const loadingId = 'typing-' + Date.now();
    appendTypingIndicator(loadingId);
    
    setStatus('busy', 'Traitement...');

    // Open pipeline panel if not open
    if (!appLayout.classList.contains('pipeline-open')) {
        appLayout.classList.add('pipeline-open');
        togglePipelineBtn.classList.add('active');
    }

    const stepInterval = simulateLoadingSteps();

    try {
        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, session_id: sessionId, patient_num: currentPatientNum, is_pedago_mode: isPedagoMode })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Erreur HTTP ${response.status}`);
        }

        const data = await response.json();

        clearInterval(stepInterval);
        removeElement(loadingId);
        
        // Mark all steps as done
        steps.forEach(s => {
            const li = document.getElementById(s.id);
            if (li) {
                li.classList.remove('active');
                li.classList.add('done');
                li.querySelector('.step-icon').textContent = '✓';
            }
        });
        
        setTimeout(() => {
            loadingSteps.classList.add('hidden');
            accordionsContainer.classList.remove('hidden');
        }, 400);

        appendMessage(data.answer, 'assistant');
        
        if (isPedagoMode && data.pedagogical_evaluation) {
            appendPedagogicalFeedback(data.pedagogical_evaluation, data.pedagogical_synthesis);
        }
        
        updateClinicalState(data.clinical_state);
        
        questionCount = data.question_count;
        updateQuestionCounter();
        
        // Update pipeline panels
        updateAnalysis(data.analysis);
        updateMotor(data.state_motor_info);
        updateVerification(data.verification_info);
        jsonContainer.textContent = JSON.stringify(data.raw_json_response, null, 2);

        setStatus('ready', 'Prêt');

    } catch (error) {
        clearInterval(stepInterval);
        removeElement(loadingId);
        console.error('Error:', error);
        showToast(error.message || "Erreur de communication avec le serveur.", 'error');
        setStatus('error', 'Erreur');
        setTimeout(() => setStatus('ready', 'Prêt'), 3000);
    }
}

// ==============================
// DIAGNOSIS
// ==============================

function openDiagnosisModal() {
    diagnosisInput.value = '';
    diagnosisModal.classList.add('visible');
    setTimeout(() => diagnosisInput.focus(), 200);
}

function closeDiagnosisModal() {
    diagnosisModal.classList.remove('visible');
}

async function handleDiagnosisSubmit() {
    const diagnosis = diagnosisInput.value.trim();
    if (!diagnosis) return;
    
    closeDiagnosisModal();
    
    appendMessage(`Diagnostic : ${diagnosis}`, 'user');
    
    const loadingId = 'typing-' + Date.now();
    appendTypingIndicator(loadingId);
    setStatus('busy', 'Évaluation...');

    try {
        const response = await fetch('/api/diagnose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diagnosis, session_id: sessionId, patient_num: currentPatientNum, is_pedago_mode: isPedagoMode })
        });

        removeElement(loadingId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            appendDiagnosisResult(false, errorData.detail || "Erreur inconnue", '', true);
            setStatus('ready', 'Prêt');
            return;
        }

        const data = await response.json();
        appendDiagnosisResult(data.is_correct, data.feedback, data.expected_diagnosis, false, data.report);
        setStatus('ready', 'Prêt');

    } catch (error) {
        removeElement(loadingId);
        console.error('Error:', error);
        showToast("Erreur lors de la soumission du diagnostic.", 'error');
        setStatus('error', 'Erreur');
        setTimeout(() => setStatus('ready', 'Prêt'), 3000);
    }
}

function appendDiagnosisResult(isCorrect, feedback, expectedDiagnosis, isWarning, report) {
    const row = document.createElement('div');
    row.classList.add('message-row', 'diagnosis-row');
    
    const card = document.createElement('div');
    card.classList.add('diagnosis-card');
    
    if (isWarning) {
        card.classList.add('diagnosis-warning');
        card.innerHTML = `
            <div class="diagnosis-icon">⚠️</div>
            <div class="diagnosis-content">
                <div class="diagnosis-title">Diagnostic refusé</div>
                <div class="diagnosis-feedback">${feedback}</div>
            </div>
        `;
    } else if (isCorrect) {
        card.classList.add('diagnosis-correct');
        card.innerHTML = `
            <div class="diagnosis-icon">🎉</div>
            <div class="diagnosis-content">
                <div class="diagnosis-title">Diagnostic correct !</div>
                <div class="diagnosis-feedback">${feedback}</div>
            </div>
        `;
    } else {
        card.classList.add('diagnosis-incorrect');
        card.innerHTML = `
            <div class="diagnosis-icon">❌</div>
            <div class="diagnosis-content">
                <div class="diagnosis-title">Diagnostic incorrect</div>
                <div class="diagnosis-feedback">${feedback}</div>
                ${expectedDiagnosis ? `<div class="diagnosis-expected">Diagnostic attendu : <strong>${expectedDiagnosis}</strong></div>` : ''}
            </div>
        `;
    }
    
    row.appendChild(card);
    chatHistory.appendChild(row);
    
    // Append scoring report if available
    if (report && !isWarning) {
        appendScoringReport(report);
    }
    
    scrollToBottom();
}

function appendScoringReport(report) {
    const row = document.createElement('div');
    row.classList.add('message-row', 'diagnosis-row');
    
    const reportCard = document.createElement('div');
    reportCard.classList.add('scoring-report');
    
    const scores = report.scores;
    const weights = report.weights;
    const details = report.details;
    const grade = report.grade;
    const finalScore = report.final_score;
    
    // Grade color
    const gradeColors = {
        'A': { bg: 'var(--accent-emerald-subtle)', color: 'var(--accent-emerald)', border: 'rgba(52, 211, 153, 0.3)' },
        'B': { bg: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', border: 'rgba(45, 212, 191, 0.3)' },
        'C': { bg: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)', border: 'rgba(251, 191, 36, 0.3)' },
        'D': { bg: 'var(--accent-rose-subtle)', color: 'var(--accent-rose)', border: 'rgba(251, 113, 133, 0.3)' },
        'F': { bg: 'var(--accent-red-subtle)', color: 'var(--accent-red)', border: 'rgba(248, 113, 113, 0.3)' },
    };
    const gc = gradeColors[grade] || gradeColors['C'];
    
    // Score bar helper
    function scoreBar(label, score, weight, colorVar) {
        const pct = Math.round(score * 100);
        return `
            <div class="score-row">
                <div class="score-row-header">
                    <span class="score-label">${label}</span>
                    <span class="score-value">${score.toFixed(2)} <span class="score-weight">×${weight.toFixed(2)}</span></span>
                </div>
                <div class="score-bar-bg">
                    <div class="score-bar-fill" style="width:${pct}%;background:${colorVar};"></div>
                </div>
            </div>
        `;
    }
    
    let html = `
        <div class="scoring-header">
            <div class="scoring-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Rapport de Notation
            </div>
            <div class="grade-badge" style="background:${gc.bg};color:${gc.color};border:1px solid ${gc.border};">
                ${grade}
            </div>
        </div>
        
        <div class="final-score-display">
            <span class="final-score-number" style="color:${gc.color};">${finalScore.toFixed(2)}</span>
            <span class="final-score-label">/ 1.00</span>
        </div>
        
        <div class="score-bars">
            ${scoreBar('Couverture anamnèse', scores.coverage, weights.w1_coverage, 'var(--accent-primary)')}
            ${scoreBar('Pertinence questions', scores.pertinence, weights.w2_pertinence, 'var(--accent-teal)')}
            ${scoreBar('Structure entretien', scores.structure, weights.w3_structure, 'var(--accent-violet)')}
            ${scoreBar('Perf. diagnostique', scores.diagnostic, weights.w4_diagnostic, 'var(--accent-emerald)')}
        </div>
    `;
    
    // Details section
    let detailsHtml = '<div class="scoring-details">';
    
    if (details.missed_topics && details.missed_topics.length > 0) {
        detailsHtml += `
            <div class="scoring-detail-item">
                <span class="scoring-detail-label">Thèmes non explorés</span>
                <div class="state-tags">
                    ${details.missed_topics.map(t => `<span class="tag rose">${t.replace(/_/g, ' ')}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    if (details.explored_topics && details.explored_topics.length > 0) {
        detailsHtml += `
            <div class="scoring-detail-item">
                <span class="scoring-detail-label">Thèmes explorés</span>
                <div class="state-tags">
                    ${details.explored_topics.map(t => `<span class="tag emerald">${t.replace(/_/g, ' ')}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    detailsHtml += `
        <div class="scoring-detail-item">
            <span class="scoring-detail-label">Questions utiles</span>
            <span class="scoring-detail-value">${details.useful_questions} / ${details.total_questions}</span>
        </div>
    `;
    
    if (details.useful_questions_list && details.useful_questions_list.length > 0) {
        detailsHtml += `
            <div class="scoring-detail-item">
                <span class="scoring-detail-label">Liste des questions utiles</span>
                <ul class="useful-questions-list">
                    ${details.useful_questions_list.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    detailsHtml += '</div>';
    html += detailsHtml;
    
    reportCard.innerHTML = html;
    row.appendChild(reportCard);
    chatHistory.appendChild(row);
}

// ==============================
// QUESTION COUNTER
// ==============================

function updateQuestionCounter() {
    const minQuestions = 3;
    const canDiagnose = questionCount >= minQuestions;
    
    questionCounterEl.className = 'question-counter' + (canDiagnose ? ' ready' : '');
    questionCounterEl.innerHTML = canDiagnose
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
           <span>${questionCount} question(s) — Diagnostic disponible</span>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
           <span>${questionCount}/${minQuestions} questions avant diagnostic</span>`;
    
    diagnoseBtn.disabled = !canDiagnose;
    diagnoseBtn.title = canDiagnose ? 'Proposer un diagnostic' : `Posez encore ${minQuestions - questionCount} question(s)`;
}

// ==============================
// CLEAR SESSION
// ==============================

async function clearSession() {
    chatHistory.innerHTML = '';
    appendSystemMessage('Session réinitialisée. Posez vos questions au patient.');
    
    clinicalStateContainer.innerHTML = '<p class="placeholder-text">En attente des données du patient...</p>';
    internalsPlaceholder.classList.remove('hidden');
    accordionsContainer.classList.add('hidden');
    loadingSteps.classList.add('hidden');
    jsonContainer.textContent = '{}';
    questionCount = 0;
    updateQuestionCounter();
    
    try {
        await fetch('/api/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: "", session_id: sessionId })
        });
    } catch (e) {
        console.error("Erreur clear session", e);
    }
}

// ==============================
// CLINICAL STATE
// ==============================

function updateClinicalState(state) {
    if (!state || Object.keys(state).length === 0) {
        clinicalStateContainer.innerHTML = '<p class="placeholder-text">Aucun état connu</p>';
        return;
    }

    let html = '';
    
    if (state.patient_attitude) {
        html += '<div class="state-section">';
        html += '<span class="state-label">Attitude du patient</span>';
        html += '<div class="state-tags">';
        html += `<span class="tag">Anxiété: ${state.patient_attitude.anxiety}</span>`;
        html += `<span class="tag teal">Précision: ${state.patient_attitude.precision}</span>`;
        html += `<span class="tag violet">Coopération: ${state.patient_attitude.cooperativeness}</span>`;
        html += '</div></div>';
    }

    if (state.revealed_facts && state.revealed_facts.length > 0) {
        html += '<div class="state-section">';
        html += '<span class="state-label">Faits révélés</span>';
        html += '<div class="state-tags">';
        state.revealed_facts.forEach(fact => {
            html += `<span class="tag emerald">${fact}</span>`;
        });
        html += '</div></div>';
    }

    if (state.asked_topics && state.asked_topics.length > 0) {
        html += '<div class="state-section">';
        html += '<span class="state-label">Sujets abordés</span>';
        html += '<div class="state-tags">';
        state.asked_topics.forEach(topicGroup => {
            if (Array.isArray(topicGroup)) {
                topicGroup.forEach(topic => {
                    html += `<span class="tag violet">${topic}</span>`;
                });
            } else {
                html += `<span class="tag violet">${topicGroup}</span>`;
            }
        });
        html += '</div></div>';
    }

    clinicalStateContainer.innerHTML = html || '<p class="placeholder-text">État initial</p>';
}

// ==============================
// PIPELINE UPDATE FUNCTIONS
// ==============================

function updateAnalysis(analysis) {
    if (!analysis) return;
    const container = document.getElementById('analysis-container');
    
    let html = `
        <div class="state-item">
            <strong>Type de Question</strong>
            <span class="tag emerald">${analysis.question_type}</span>
        </div>
        <div class="state-item">
            <strong>Nécessite RAG</strong>
            <span class="tag ${analysis.requires_retrieval ? 'emerald' : ''}">${analysis.requires_retrieval ? 'Oui' : 'Non'}</span>
        </div>
    `;

    if (analysis.search_keywords) {
        html += `<div class="state-item"><strong>Mots-clés</strong><span class="tag rose">${analysis.search_keywords}</span></div>`;
    }

    if (analysis.target_slots && analysis.target_slots.length > 0) {
        html += '<div class="state-item"><strong>Slots cibles</strong><div class="state-tags">';
        analysis.target_slots.forEach(slot => {
            html += `<span class="tag amber">${slot}</span>`;
        });
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function updateMotor(info) {
    const container = document.getElementById('motor-container');
    if (!info || Object.keys(info).length === 0) {
        container.innerHTML = '<p class="placeholder-text">Aucune info</p>';
        return;
    }

    let html = `
        <div class="state-item">
            <strong>Documents</strong>
            <span>Avant: <strong style="color:var(--text-primary)">${info.before_count}</strong> → Après: <strong style="color:var(--accent-emerald)">${info.after_count}</strong></span>
        </div>
        <div class="state-item">
            <strong>Topics globaux</strong>
            <div class="state-tags">
    `;
    
    if (info.global_topics_used && info.global_topics_used.length > 0) {
        info.global_topics_used.forEach(topicGroup => {
            if (Array.isArray(topicGroup)) {
                topicGroup.forEach(topic => {
                    html += `<span class="tag violet">${topic}</span>`;
                });
            } else {
                html += `<span class="tag violet">${topicGroup}</span>`;
            }
        });
    } else {
        html += `<span style="color:var(--text-muted);font-style:italic;font-size:0.82rem;">Aucun</span>`;
    }
    
    html += `</div></div>`;
    container.innerHTML = html;
}

function updateVerification(info) {
    const container = document.getElementById('verification-container');
    if (!info || Object.keys(info).length === 0) {
        container.innerHTML = '<p class="placeholder-text">Aucune info</p>';
        return;
    }

    const badgeClass = info.is_valid ? 'success' : 'error';
    const badgeText = info.is_valid ? '✓ Valide' : '✗ Échec';

    let html = `
        <div class="status-badge ${badgeClass}">${badgeText}</div>
        <div class="state-item"><strong>Message</strong><span style="font-size:0.82rem;">${info.message}</span></div>
        <div class="state-item"><strong>Tentatives</strong><span style="font-size:0.82rem;">${info.tentatives}</span></div>
        <div class="state-item"><strong>Nouvelle affirmation inventée</strong>
            <span class="tag ${info.contains_new_claim ? 'rose' : 'emerald'}">${info.contains_new_claim ? 'Oui ✗' : 'Non ✓'}</span>
        </div>
        <div class="state-item"><strong>Fact IDs Autorisés</strong><div class="state-tags">
    `;
    
    if (info.authorized_fact_ids.length > 0) {
        info.authorized_fact_ids.forEach(id => {
            html += `<span class="tag">${id}</span>`;
        });
    } else {
        html += `<span style="color:var(--text-muted);font-style:italic;font-size:0.82rem;">Aucun</span>`;
    }

    html += `</div></div><div class="state-item"><strong>Fact IDs Utilisés</strong><div class="state-tags">`;
    
    if (info.used_fact_ids.length > 0) {
        info.used_fact_ids.forEach(id => {
            const isAuth = info.authorized_fact_ids.includes(id);
            html += `<span class="tag ${isAuth ? 'emerald' : 'rose'}">${id}</span>`;
        });
    } else {
        html += `<span style="color:var(--text-muted);font-style:italic;font-size:0.82rem;">Aucun</span>`;
    }
    
    html += `</div></div>`;
    container.innerHTML = html;
}
