// Firebase SDKs imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Firebase instances
let app;
let db;
let auth;
let userId = 'anonymous'; // Default or will be updated by auth state
let userName = '';

// UI Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const plannerDashboard = document.getElementById('plannerDashboard');
const startButton = document.getElementById('startButton');
const userNameInput = document.getElementById('userNameInput');
const currentDayDisplay = document.getElementById('currentDayDisplay');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const dailyPrompt = document.getElementById('dailyPrompt');
const reflectionTextarea = document.getElementById('reflectionTextarea');
const howIFeltTextarea = document.getElementById('howIFeltTextarea');
const whatWorkedTextarea = document.getElementById('whatWorkedTextarea');
const whatToImproveTextarea = document.getElementById('whatToImproveTextarea');
const prevDayButton = document.getElementById('prevDayButton');
const nextDayButton = document.getElementById('nextDayButton');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const displayUserId = document.getElementById('displayUserId');
const printButton = document.getElementById('printButton');
const loadingSpinner = document.getElementById('loadingSpinner');

// Checkboxes
const nutricaoCheckbox = document.getElementById('nutricaoCheckbox');
const suplementacaoCheckbox = document.getElementById('suplementacaoCheckbox');
const movimentoCheckbox = document.getElementById('movimentoCheckbox');
const sonoCheckbox = document.getElementById('sonoCheckbox');
const mindfulnessCheckbox = document.getElementById('mindfulnessCheckbox');
const hidratacaoCheckbox = document.getElementById('hidratacaoCheckbox');

// Rating inputs and spans
const focoRating = document.getElementById('focoRating');
const focoValue = document.getElementById('focoValue');
const energiaRating = document.getElementById('energiaRating');
const energiaValue = document.getElementById('energiaValue');
const clarezaRating = document.getElementById('clarezaRating');
const clarezaValue = document.getElementById('clarezaValue');

// Custom modal elements
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

let currentDay = 1; // Start with Day 1
const TOTAL_DAYS = 21;
let plannerData = {}; // Cache for planner data

// Prompts for each day (you can expand this as needed for all 21 days)
const prompts = [
    null, // Day 0, not used
    "Qual é a sua principal motivação para iniciar o Protocolo Cérebro Hacker? Como você se sente hoje, no início desta jornada?",
    "Qual foi o maior desafio que você enfrentou hoje em relação aos 6 pilares e como você o superou (ou planeja superar)?",
    "Que pequena mudança você pode implementar amanhã para otimizar um dos 6 pilares que você sente que precisa de mais atenção?",
    "Observe como a Nutrição Neuroativa impactou seu foco hoje. Houve alguma diferença significativa?",
    "Como o Movimento Neuroprotetor influenciou seu humor e nível de energia hoje?",
    "Qual foi o insight mais valioso que você teve sobre sua mente ou corpo até agora neste protocolo?",
    "Reflita sobre esta primeira semana (Dias 1-7). O que mudou em você? Quais são seus maiores aprendizados e desafios para a próxima fase?",
    "Entrando na fase Turbo Neuronal, qual é o seu principal objetivo para esta semana?",
    "Que barreira mental você superou hoje ou percebeu que precisa trabalhar?",
    "Como a prática de Mindfulness/Meditação contribuiu para sua clareza mental hoje?",
    "Qual alimento neuroativo você introduziu ou aumentou o consumo hoje e como se sentiu?",
    "Descreva um momento de alta energia ou foco que você teve hoje. O que você acredita que o causou?",
    "Em relação ao Sono Reparador, o que você fez hoje que mais contribuiu para uma noite de sono de qualidade?",
    "Quais foram as maiores 'vitórias' desta semana (Dias 8-14)? O que você pode levar para a próxima fase de Sincronização Final?",
    "Na Sincronização Final, como você planeja consolidar os hábitos dos 6 pilares para que se tornem parte da sua rotina?",
    "Como você lida com as distrações e o que você fez hoje para manter o foco?",
    "Avalie sua hidratação hoje. Você sentiu alguma diferença em sua energia ou clareza mental?",
    "Qual aspecto do Protocolo Cérebro Hacker você achou mais desafiador e como você se sente em relação a ele agora?",
    "Que nova estratégia ou ajuste você fez hoje para otimizar seu bem-estar geral?",
    "Olhando para trás, qual é a principal mudança que você percebeu em sua mentalidade ou saúde?",
    "Parabéns por completar o Protocolo Cérebro Hacker! Como você se sente agora em comparação com o Dia 1? Quais são seus planos para manter esses hábitos no longo prazo?"
];

/**
 * Shows a custom modal for alerts or confirmations.
 */
function showCustomModal(title, message, isConfirm = false) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');

    if (isConfirm) {
        modalCancelBtn.classList.remove('hidden');
        return new Promise((resolve) => {
            modalConfirmBtn.onclick = () => {
                customModal.classList.add('hidden');
                resolve(true);
            };
            modalCancelBtn.onclick = () => {
                customModal.classList.add('hidden');
                resolve(false);
            };
        });
    } else {
        modalCancelBtn.classList.add('hidden');
        modalConfirmBtn.onclick = () => {
            customModal.classList.add('hidden');
        };
    }
}

/**
 * Shows the loading spinner.
 */
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

/**
 * Hides the loading spinner.
 */
function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

/**
 * Initializes Firebase and authenticates the user.
 */
async function initializeFirebase() {
    showLoading();
    try {
        const firebaseConfig = window.__firebase_config_obj || {};

        if (Object.keys(firebaseConfig).length === 0) {
            showCustomModal('Erro de Configuração', 'Configuração do Firebase não encontrada. O aplicativo pode não funcionar corretamente. Por favor, recarregue a página.');
            console.error("Firebase config is empty or not provided.");
            hideLoading();
            return;
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                displayUserId.textContent = `ID: ${userId}`; // Update UI with the actual ID
                console.log("Firebase user authenticated:", userId);

                await loadUserName();
                if (userName) {
                    showPlanner();
                } else {
                    welcomeScreen.classList.remove('hidden');
                    plannerDashboard.classList.add('hidden');
                }
            } else {
                await signInAnonymously(auth);
            }
            hideLoading();
        });

    } catch (error) {
        console.error("Erro ao inicializar Firebase ou autenticar:", error);
        showCustomModal('Erro de Inicialização', `Não foi possível conectar. Erro: ${error.message}`);
        hideLoading();
    }
}

/**
 * Gets the Firestore collection reference for user's planner data.
 * --- CORRIGIDO ---
 */
function getPlannerCollectionRef() {
    // Path: users/{userId}/plannerData
    return collection(db, `users/${userId}/plannerData`);
}

/**
 * Gets the Firestore document reference for a specific day's data.
 */
function getDayDocRef(day) {
    return doc(getPlannerCollectionRef(), `day_${day}`);
}

/**
 * Loads user name from Firestore.
 * --- CORRIGIDO ---
 */
async function loadUserName() {
    if (!db || !userId || userId === 'anonymous') {
        console.warn("Firestore not ready or userId not set. Cannot load user name.");
        return;
    }
    try {
        const userDocRef = doc(db, 'users', userId); // Correct, simpler path
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().name) {
            userName = userDocSnap.data().name;
            userNameInput.value = userName;
        }
    } catch (error) {
        console.error("Erro ao carregar nome do usuário:", error);
    }
}

/**
 * Saves user name to Firestore.
 * --- CORRIGIDO ---
 */
async function saveUserName(name) {
    if (!userId || !name || !db) {
        console.warn("userId ou nome não definido, ou Firestore não inicializado. Não é possível salvar nome.");
        return;
    }
    try {
        const userDocRef = doc(db, 'users', userId); // Correct, simpler path
        await setDoc(userDocRef, { name: name }, { merge: true }); // Use merge to avoid overwriting other data
        console.log("Nome do usuário salvo com sucesso:", name);
    } catch (error) {
        console.error("Erro ao salvar nome do usuário:", error);
        showCustomModal('Erro ao Salvar', 'Não foi possível salvar seu nome.');
    }
}


/**
 * Shows the planner dashboard and hides the welcome screen.
 */
function showPlanner() {
    welcomeScreen.classList.add('hidden');
    plannerDashboard.classList.remove('hidden');
    loadDailyData(); // Load data for the current day after showing planner
}

/**
 * Loads data for the current day from Firestore.
 */
async function loadDailyData() {
    showLoading();
    if (!db || !userId) {
        console.warn("Firestore não inicializado ou userId não definido. Não é possível carregar dados.");
        hideLoading();
        return;
    }
    try {
        const docRef = getDayDocRef(currentDay);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            plannerData[currentDay] = docSnap.data();
            console.log(`Dados do Dia ${currentDay} carregados:`, plannerData[currentDay]);
        } else {
            plannerData[currentDay] = {}; // No data found, initialize empty
            console.log(`Nenhum dado encontrado para o Dia ${currentDay}.`);
        }
        updateUI();
        hideLoading();
    } catch (error) {
        console.error(`Erro ao carregar dados do Dia ${currentDay}:`, error);
        showCustomModal('Erro de Carregamento', `Não foi possível carregar os dados do Dia ${currentDay}.`);
        plannerData[currentDay] = {}; // Reset data on error
        updateUI();
        hideLoading();
    }
}

/**
 * Saves data for the current day to Firestore.
 */
async function saveDailyData() {
    if (!userId || !db) {
        console.warn("userId não definido ou Firestore não inicializado. Não é possível salvar dados.");
        return;
    }

    const dataToSave = {
        nutricao: nutricaoCheckbox.checked,
        suplementacao: suplementacaoCheckbox.checked,
        movimento: movimentoCheckbox.checked,
        sono: sonoCheckbox.checked,
        mindfulness: mindfulnessCheckbox.checked,
        hidratacao: hidratacaoCheckbox.checked,
        foco: parseInt(focoRating.value),
        energia: parseInt(energiaRating.value),
        clareza: parseInt(clarezaRating.value),
        reflection: reflectionTextarea.value,
        howIFelt: howIFeltTextarea.value,
        whatWorked: whatWorkedTextarea.value,
        whatToImprove: whatToImproveTextarea.value,
        timestamp: new Date().toISOString() // Save timestamp of last update
    };

    try {
        await setDoc(getDayDocRef(currentDay), dataToSave, { merge: true });
        plannerData[currentDay] = dataToSave; // Update cache
        console.log(`Dados do Dia ${currentDay} salvos com sucesso.`);
        updateOverallProgress(); // Update progress after saving
    } catch (error) {
        console.error(`Erro ao salvar dados do Dia ${currentDay}:`, error);
        showCustomModal('Erro ao Salvar', `Não foi possível salvar os dados do Dia ${currentDay}.`);
    }
}

/**
 * Updates the UI elements with the current day's data.
 */
function updateUI() {
    const data = plannerData[currentDay] || {};

    // Update header
    currentDayDisplay.textContent = currentDay;
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = today.getFullYear();
    currentDateDisplay.textContent = `${day}/${month}/${year}`;

    // Set prompt
    dailyPrompt.textContent = prompts[currentDay] || "Nenhum prompt disponível para este dia.";

    // Set checkboxes
    nutricaoCheckbox.checked = data.nutricao || false;
    suplementacaoCheckbox.checked = data.suplementacao || false;
    movimentoCheckbox.checked = data.movimento || false;
    sonoCheckbox.checked = data.sono || false;
    mindfulnessCheckbox.checked = data.mindfulness || false;
    hidratacaoCheckbox.checked = data.hidratacao || false;

    // Set ratings
    focoRating.value = data.foco !== undefined ? data.foco : 0;
    focoValue.textContent = focoRating.value;
    energiaRating.value = data.energia !== undefined ? data.energia : 0;
    energiaValue.textContent = energiaRating.value;
    clarezaRating.value = data.clareza !== undefined ? data.clareza : 0;
    clarezaValue.textContent = clarezaRating.value;

    // Set textareas
    reflectionTextarea.value = data.reflection || '';
    howIFeltTextarea.value = data.howIFelt || '';
    whatWorkedTextarea.value = data.whatWorked || '';
    whatToImproveTextarea.value = data.whatToImprove || '';

    // Update navigation buttons state
    prevDayButton.disabled = currentDay === 1;
    nextDayButton.disabled = currentDay === TOTAL_DAYS;

    updateOverallProgress();
}

/**
 * Calculates and updates the overall progress bar.
 */
async function updateOverallProgress() {
    if (!db || !userId) {
        console.log("Firebase not initialized or userId not set. Skipping progress update.");
        return;
    }
    try {
        const querySnapshot = await getDocs(query(getPlannerCollectionRef()));
        let completedDaysCount = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Consider a day "completed" if all 6 checkboxes are true AND all textareas have some content
            if (data.nutricao && data.suplementacao && data.movimento &&
                data.sono && data.mindfulness && data.hidratacao &&
                data.reflection && data.howIFelt && data.whatWorked && data.whatToImprove) {
                completedDaysCount++;
            }
        });

        const percentage = (completedDaysCount / TOTAL_DAYS) * 100;
        progressBar.style.width = `${percentage.toFixed(0)}%`;
        progressText.textContent = `${percentage.toFixed(0)}%`;
    } catch (error) {
        console.error("Erro ao calcular o progresso geral:", error);
    }
}


/**
 * Event listener for range inputs to update their value display and save data.
 */
function setupRangeInputListeners() {
    focoRating.addEventListener('input', () => {
        focoValue.textContent = focoRating.value;
        saveDailyData();
    });
    energiaRating.addEventListener('input', () => {
        energiaValue.textContent = energiaRating.value;
        saveDailyData();
    });
    clarezaRating.addEventListener('input', () => {
        clarezaValue.textContent = clarezaRating.value;
        saveDailyData();
    });
}

// --- Event Listeners ---
startButton.addEventListener('click', async () => {
    const name = userNameInput.value.trim();
    if (name) {
        userName = name; // Update global userName
        await saveUserName(name); // Save user name to Firestore
        showPlanner(); // Call showPlanner directly now that name is saved/updated
    } else {
        showCustomModal('Nome Necessário', 'Por favor, digite seu nome para começar sua jornada.');
    }
});

prevDayButton.addEventListener('click', () => {
    if (currentDay > 1) {
        currentDay--;
        loadDailyData();
    }
});

nextDayButton.addEventListener('click', () => {
    if (currentDay < TOTAL_DAYS) {
        currentDay++;
        loadDailyData();
    }
});

// Save data on change for checkboxes and textareas
[nutricaoCheckbox, suplementacaoCheckbox, movimentoCheckbox,
    sonoCheckbox, mindfulnessCheckbox, hidratacaoCheckbox,
    reflectionTextarea, howIFeltTextarea, whatWorkedTextarea, whatToImproveTextarea
].forEach(element => {
    element.addEventListener('change', saveDailyData);
    element.addEventListener('input', saveDailyData); // For textareas as well
});


// Print functionality
printButton.addEventListener('click', () => {
    window.print();
});


// Initialize on window load
window.onload = () => {
    initializeFirebase();
    setupRangeInputListeners(); // Set up range listeners once
};
