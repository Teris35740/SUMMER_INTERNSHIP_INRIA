const chatHistory = document.getElementById('chat-history');
const questionInput = document.getElementById('question-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const clinicalStateContainer = document.getElementById('clinical-state-container');
const analysisContainer = document.getElementById('analysis-container');
const jsonContainer = document.getElementById('json-container');

// Session ID (could be dynamic in a real app)
const sessionId = "session_1";

// Handle Enter key
questionInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

clearBtn.addEventListener('click', async () => {
    chatHistory.innerHTML = '<div class="message system">Bonjour ! Je suis le patient. Posez-moi vos questions. (Session réinitialisée)</div>';
    clinicalStateContainer.innerHTML = '<p class="placeholder">En attente des données du patient...</p>';
    analysisContainer.innerHTML = '<p class="placeholder">Posez une question pour voir l\'analyse.</p>';
    jsonContainer.textContent = '{}';
    
    try {
        await fetch('/api/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: "", session_id: sessionId })
        });
    } catch (e) {
        console.error("Erreur clear session", e);
    }
});

async function sendMessage() {
    const question = questionInput.value.trim();
    if (!question) return;

    // Append user message
    appendMessage(question, 'user');
    questionInput.value = '';

    // Append loading message
    const loadingId = 'loading-' + Date.now();
    appendLoadingMessage(loadingId);

    try {
        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, session_id: sessionId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Remove loading message
        removeMessage(loadingId);

        // Append assistant message
        appendMessage(data.answer, 'assistant');

        // Update Clinical State
        updateClinicalState(data.clinical_state);

        // Update Analysis
        updateAnalysis(data.analysis);

        // Update JSON
        jsonContainer.textContent = JSON.stringify(data.raw_json_response, null, 2);

    } catch (error) {
        console.error('Error:', error);
        removeMessage(loadingId);
        appendMessage("Une erreur s'est produite lors de la communication avec le serveur.", 'system');
    }
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendLoadingMessage(id) {
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.classList.add('message', 'loading');
    msgDiv.textContent = 'Le patient réfléchit...';
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeMessage(id) {
    const msg = document.getElementById(id);
    if (msg) {
        msg.remove();
    }
}

function updateClinicalState(state) {
    if (!state || Object.keys(state).length === 0) {
        clinicalStateContainer.innerHTML = '<p class="placeholder">Aucun état connu</p>';
        return;
    }

    let html = '';
    
    if (state.revealed_facts && state.revealed_facts.length > 0) {
        html += '<div class="state-item"><strong>Faits Révélés :</strong>';
        state.revealed_facts.forEach(fact => {
            html += `<span class="tag">${fact}</span> `;
        });
        html += '</div>';
    }

    if (state.asked_topics && state.asked_topics.length > 0) {
        html += '<div class="state-item"><strong>Sujets Abordés :</strong>';
        state.asked_topics.forEach(topic => {
            html += `<span class="tag" style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd;">${topic}</span> `;
        });
        html += '</div>';
    }

    clinicalStateContainer.innerHTML = html || '<p class="placeholder">État initial</p>';
}

function updateAnalysis(analysis) {
    if (!analysis) return;

    let html = `
        <div class="state-item">
            <strong>Type de Question:</strong>
            <span class="tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7;">
                ${analysis.question_type}
            </span>
        </div>
        <div class="state-item">
            <strong>Nécessite Recherche:</strong>
            <span class="tag" style="background: ${analysis.requires_retrieval ? 'rgba(239, 68, 68, 0.2)' : 'rgba(107, 114, 128, 0.2)'}; color: ${analysis.requires_retrieval ? '#fca5a5' : '#d1d5db'};">
                ${analysis.requires_retrieval ? 'Oui' : 'Non'}
            </span>
        </div>
    `;

    if (analysis.search_keywords) {
        html += `
        <div class="state-item">
            <strong>Mots-clés de recherche:</strong>
            <span class="tag" style="background: rgba(236, 72, 153, 0.2); color: #f472b6;">
                ${analysis.search_keywords}
            </span>
        </div>`;
    }

    if (analysis.target_slots && analysis.target_slots.length > 0) {
        html += '<div class="state-item"><strong>Slots cibles:</strong>';
        analysis.target_slots.forEach(slot => {
            html += `<span class="tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d;">${slot}</span> `;
        });
        html += '</div>';
    }

    analysisContainer.innerHTML = html;
}
