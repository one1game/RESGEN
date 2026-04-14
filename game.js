// ======== game.js (ПОЛНАЯ ОБНОВЛЁННАЯ ВЕРСИЯ) ========

import init, { start_game, apply_config_from_admin } from './pkg/corebox_rs.js';
import { 
    initStatistics, 
    updateStatisticsDisplay,
    switchTab,
    gameStats,
    saveStatistics,
    loadUserStatistics,
    resetUserStatistics,
    updateStatisticsFromRust
} from './statistics.js';

import { craftModule } from './craft.js';
import { designModule } from './design.js';
import { fleetModule } from './fleet.js';

// ========== ИМПОРТЫ SUPABASE ==========
import { initAuth, logout, getCurrentUser, login, register } from './auth.js';
import { saveGameToCloud, loadGameFromCloud, updateLeaderboard, getLeaderboard } from './save.js';

let game;
window.getCurrentGameState = () => getCurrentGameState();
let lastConfigHash = null;
let isAutoClicking = false;
let currentUser = null;
let lastRustStats = null;
let clickCounter = 0;
let powerTracker = 0;
let _autoSaveCounter = 0;

let comboCount = 0;
let lastClickTime = 0;

let prestigeLevel = Number(localStorage.getItem('corebox_prestige_level')) || 0;

let randomEventTimer = 0;

let _saveDirty = false;
let _saveTimer = null;
let _cloudSaveTimer = null;

// Флаг для отслеживания инициализации игры
let isGameInitialized = false;

// Восстанавливаем состояние автокликера
if (localStorage.getItem('corebox_autoclicking') === 'true') {
    isAutoClicking = true;
}

function scheduleSave() {
    _saveDirty = true;
    if (!_saveTimer) {
        _saveTimer = setTimeout(() => {
            _saveTimer = null;
            if (_saveDirty) { 
                _saveDirty = false; 
                saveCurrentUserStatistics(); 
            }
        }, 5000);
    }
}

// Сохранение в облако с дебаунсом
function scheduleCloudSave(gameState) {
    if (!currentUser) return;
    
    if (_cloudSaveTimer) clearTimeout(_cloudSaveTimer);
    _cloudSaveTimer = setTimeout(async () => {
        if (gameState) {
            await saveGameToCloud(gameState);
        }
        _cloudSaveTimer = null;
    }, 2000);
}

let sounds = {
    click: null,
    error: null,
    upgrade: null
};

function showFloatingText(text, x, y) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    floatingText.style.left = `${x}px`;
    floatingText.style.top = `${y}px`;
    document.body.appendChild(floatingText);
    
    setTimeout(() => {
        floatingText.classList.add('fade-out');
        setTimeout(() => floatingText.remove(), 500);
    }, 800);
}

function addToLog(message) {
    const logBox = document.getElementById('logBox');
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logBox.appendChild(entry);
    while (logBox.children.length > 50) {
        logBox.removeChild(logBox.firstChild);
    }
    logBox.scrollTop = logBox.scrollHeight;
}

function triggerRandomEvent() {
    const events = [
        { 
            name: '🎁 Найден тайник!', 
            effect: () => {
                const amount = 30 + Math.floor(Math.random() * 40);
                try { game.add_resource('coal', amount); } catch(e) {}
                showFloatingText(`+${amount} угля`, window.innerWidth / 2, 150);
                return `+${amount} угля`;
            }
        },
        { 
            name: '☄️ Метеоритный дождь!', 
            effect: () => {
                const amount = 15 + Math.floor(Math.random() * 25);
                try { game.add_resource('ore', amount); } catch(e) {}
                showFloatingText(`+${amount} руды`, window.innerWidth / 2, 150);
                return `+${amount} руды`;
            }
        },
        { 
            name: '⚠️ Перегрев системы!', 
            effect: () => {
                const power = game?.get_computational_power() || 0;
                const loss = Math.min(20, Math.floor(power * 0.1));
                try { game.subtract_power(loss); } catch(e) {}
                showFloatingText(`-${loss} мощности`, window.innerWidth / 2, 150);
                return `-${loss} мощности`;
            }
        },
        { 
            name: '💀 Саботаж повстанцев!', 
            effect: () => {
                const coal = game?.get_resource('coal') || 0;
                const loss = Math.min(25, Math.floor(coal * 0.15));
                try { game.subtract_resource('coal', loss); } catch(e) {}
                showFloatingText(`-${loss} угля`, window.innerWidth / 2, 150);
                return `-${loss} угля`;
            }
        },
        { 
            name: '🔧 Ремонтный дрон!', 
            effect: () => {
                try { game.repair_systems(); } catch(e) {}
                showFloatingText('Системы восстановлены', window.innerWidth / 2, 150);
                return 'системы восстановлены';
            }
        },
        { 
            name: '📡 Спутниковая связь!', 
            effect: () => {
                const power = 25 + Math.floor(Math.random() * 35);
                try { game.add_power(power); } catch(e) {}
                showFloatingText(`+${power} мощности`, window.innerWidth / 2, 150);
                return `+${power} мощности`;
            }
        }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    const result = event.effect();
    playSound('upgrade');
    
    const logMsg = document.createElement('div');
    logMsg.className = 'log-entry event-log';
    logMsg.textContent = `✨ ${event.name} ${result}`;
    const logBox = document.getElementById('logBox');
    if (logBox) {
        logBox.appendChild(logMsg);
        
        while (logBox.children.length > 50) {
            logBox.removeChild(logBox.firstChild);
        }
        
        logBox.scrollTop = logBox.scrollHeight;
    }
    showFloatingText(event.name, 300, 100);
}

function prestigeReset() {
    if (!game) return;
    
    const confirmed = confirm('ПРЕСТИЖ!\n\nВы начнёте игру заново, но получите:\n• +10% к шансу крита\n• +0.5 к множителю комбо\n• +5% к шансу случайных событий\n\nПродолжить?');
    
    if (confirmed) {
        prestigeLevel++;
        localStorage.setItem('corebox_prestige_level', prestigeLevel);
        
        if (typeof game.reset_progress === 'function') {
            game.reset_progress();
        }
        
        showFloatingText(`🔁 ПРЕСТИЖ ${prestigeLevel}!`, window.innerWidth / 2, window.innerHeight / 2);
        
        const event = new CustomEvent('prestigeComplete', { detail: { level: prestigeLevel } });
        document.dispatchEvent(event);
        
        // Сохраняем в облако после престижа
        scheduleCloudSave(getCurrentGameState());
    }
}

function getPrestigeBonus() {
    return {
        critBonus: prestigeLevel * 0.01,
        comboBonus: prestigeLevel * 0.05,
        eventBonus: prestigeLevel * 0.005
    };
}

// ========== ОФЛАЙН ПРОГРЕСС ==========
function calculateOfflineProgress(savedState) {
    const now = Date.now();
    const lastSaved = savedState?._savedAt || now;
    const elapsedSeconds = Math.floor((now - lastSaved) / 1000);
    
    // Максимум 8 часов офлайна
    const cappedSeconds = Math.min(elapsedSeconds, 8 * 3600);
    if (cappedSeconds < 10) return null;

    // Цикл: 32 игровых сек = 1 сек реального времени
    const TICK_RATE = 1;
    const ticks = cappedSeconds * TICK_RATE;
    
    // Пассивная добыча из конфига (значения по умолчанию)
    const passive = savedState?._passive_rates || { coal: 0.004, trash: 0.008, ore: 0.003 };
    const coalGained = Math.floor(ticks * passive.coal);
    const trashGained = Math.floor(ticks * passive.trash);
    const oreGained = Math.floor(ticks * passive.ore);
    
    // Смена дня/ночи (32 секунды = 1 цикл)
    const CYCLE = 32;
    const cycles = Math.floor(cappedSeconds / CYCLE);
    
    // Атаки во время офлайна (упрощённая симуляция)
    const BASE_ATTACK_CHANCE = 0.04;
    let attacksDuringOffline = 0;
    for (let i = 0; i < cycles; i++) {
        if (Math.random() < BASE_ATTACK_CHANCE) attacksDuringOffline++;
    }
    
    return {
        elapsedSeconds: cappedSeconds,
        coalGained,
        trashGained,
        oreGained,
        cyclesPassed: cycles,
        attacksDuringOffline
    };
}

function showOfflineRewardPopup(progress) {
    const mins = Math.floor(progress.elapsedSeconds / 60);
    const hours = Math.floor(mins / 60);
    const timeStr = hours > 0 ? `${hours}ч ${mins % 60}м` : `${mins}м`;
    
    addToLog(`⏰ Прошло ${timeStr} офлайна: +${progress.coalGained}🪨 +${progress.trashGained}♻️ +${progress.oreGained}⛏️`);
    showFloatingText(`⏰ Офлайн ${timeStr}`, window.innerWidth/2, 200);
    
    // Создаём попап
    const popup = document.createElement('div');
    popup.className = 'offline-popup';
    popup.innerHTML = `
        <h3>⏰ ВОЗВРАЩЕНИЕ В ОНЛАЙН</h3>
        <p>Прошло: ${timeStr}</p>
        <div class="offline-resources">
            <div class="resource">🪨 +${progress.coalGained}</div>
            <div class="resource">♻️ +${progress.trashGained}</div>
            <div class="resource">⛏️ +${progress.oreGained}</div>
        </div>
        <button onclick="this.parentElement.remove()">ПРОДОЛЖИТЬ</button>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentElement) popup.remove();
    }, 5000);
}

// ========== ФУНКЦИЯ ДЛЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК СТАТУСА ==========
function switchStatusTab(tab) {
    ['system-status', 'statistics', 'leaderboard'].forEach(t => {
        const section = document.getElementById(`${t}-section`);
        const tabEl = document.getElementById(`${t}-tab`);
        if (section) section.style.display = 'none';
        if (tabEl) tabEl.classList.remove('active');
    });
    const activeSection = document.getElementById(`${tab}-section`);
    const activeTab = document.getElementById(`${tab}-tab`);
    if (activeSection) activeSection.style.display = 'block';
    if (activeTab) activeTab.classList.add('active');
}

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;
    container.innerHTML = '<div class="leaderboard-loading">⏳ Загрузка...</div>';
    
    try {
        const leaders = await getLeaderboard();
        if (!leaders || leaders.length === 0) {
            container.innerHTML = '<div class="leaderboard-empty">Данных пока нет</div>';
            return;
        }
        container.innerHTML = leaders.map((entry, i) => `
            <div class="leaderboard-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">
                <span class="lb-rank">${['🥇','🥈','🥉'][i] || (i+1)+'.'}</span>
                <span class="lb-name">${escapeHtml(entry.username || entry.email?.split('@')[0] || 'Игрок')}</span>
                <span class="lb-score">⛏️ ${entry.total_mined || 0}</span>
                <span class="lb-nights">🌙 ${entry.nights_survived || 0}</span>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = '<div class="leaderboard-error">❌ Ошибка загрузки</div>';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ========== ПОЛУЧИТЬ ТЕКУЩЕЕ СОСТОЯНИЕ ИГРЫ ==========
function getCurrentGameState() {
    if (!game) return null;
    try {
        const statsJson = game.get_statistics();
        if (statsJson) {
            return JSON.parse(statsJson);
        }
    } catch (e) {
        console.warn("Не удалось получить состояние игры:", e);
    }
    return null;
}

// ========== ЗАГРУЗИТЬ СОСТОЯНИЕ В ИГРУ (С ОФЛАЙН ПРОГРЕССОМ) ==========
async function loadGameStateIntoSave(cloudSave) {
    if (!game || !cloudSave) {
        if (game) {
            try {
                const backup = localStorage.getItem('corebox_save_backup');
                if (backup) {
                    const backupState = JSON.parse(backup);
                    if (typeof game.load_game_state === 'function') {
                        game.load_game_state(JSON.stringify(backupState));
                        console.log("📦 Восстановлено из локального резерва");
                    }
                    localStorage.removeItem('corebox_save_backup');
                }
            } catch(e) {}
        }
        return false;
    }
    
    try {
        // Сохраняем timestamp до загрузки для офлайн расчёта
        const offlineProgress = calculateOfflineProgress(cloudSave);
        
        if (typeof game.load_game_state === 'function') {
            game.load_game_state(JSON.stringify(cloudSave));
            console.log("✅ Состояние загружено из облака через Rust");
            
            // Применяем офлайн прогресс
            if (offlineProgress && offlineProgress.elapsedSeconds > 10) {
                try {
                    if (offlineProgress.coalGained > 0) game.add_resource('coal', offlineProgress.coalGained);
                    if (offlineProgress.trashGained > 0) game.add_resource('trash', offlineProgress.trashGained);
                    if (offlineProgress.oreGained > 0) game.add_resource('ore', offlineProgress.oreGained);
                    
                    addToLog(`⏰ Офлайн прогресс: +${offlineProgress.coalGained}🪨 +${offlineProgress.trashGained}♻️ +${offlineProgress.oreGained}⛏️`);
                    
                    if (offlineProgress.attacksDuringOffline > 0) {
                        addToLog(`⚠️ За время отсутствия произошло ${offlineProgress.attacksDuringOffline} атак повстанцев!`);
                    }
                } catch(e) {
                    console.warn("Ошибка применения офлайн прогресса:", e);
                }
                showOfflineRewardPopup(offlineProgress);
            }
            
            // Восстанавливаем чертежи
            if (cloudSave._blueprints && cloudSave._blueprints.length > 0) {
                localStorage.setItem('corebox_ship_blueprints', JSON.stringify(cloudSave._blueprints));
                console.log("📐 Чертежи восстановлены из облака");
            }
            
            // Восстанавливаем статистику
            if (cloudSave._statistics && currentUser) {
                const users = JSON.parse(localStorage.getItem('corebox_users') || '{}');
                if (!users[currentUser.email]) users[currentUser.email] = {};
                users[currentUser.email].statistics = cloudSave._statistics;
                localStorage.setItem('corebox_users', JSON.stringify(users));
                loadUserStatistics(cloudSave._statistics);
                console.log("📊 Статистика восстановлена из облака");
            }
            
            return true;
        } else {
            console.log("⚠️ Метод load_game_state не найден, используем fallback");
            if (cloudSave.coal_inventory !== undefined) game.add_resource('coal', cloudSave.coal_inventory);
            if (cloudSave.ore_inventory !== undefined) game.add_resource('ore', cloudSave.ore_inventory);
            if (cloudSave.chips_inventory !== undefined) game.add_resource('chips', cloudSave.chips_inventory);
            if (cloudSave.plasma_inventory !== undefined) game.add_resource('plasma', cloudSave.plasma_inventory);
            if (cloudSave.trash_inventory !== undefined) game.add_resource('trash', cloudSave.trash_inventory);
            return true;
        }
    } catch (e) {
        console.error("❌ Ошибка загрузки состояния из облака:", e);
        return false;
    }
}

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА АВТОРИЗАЦИИ ==========
function showAuthUI() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('gameContent').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

function showGameUI() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('gameContent').style.display = 'block';
    document.getElementById('userInfo').style.display = 'block';
}

function updateUserDisplay(user) {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const prestigeTag = prestigeLevel > 0 ? ` ✦${prestigeLevel}` : '';
    const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Игрок';
    if (usernameDisplay) {
        usernameDisplay.textContent = displayName + prestigeTag;
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ АВТОРИЗАЦИИ ==========
function initializeAuth() {
    console.log("🔐 Инициализация авторизации Supabase...");
    
    setupAuthFormHandlers();
    
    initAuth(
        async (user) => {
            console.log("✅ Пользователь вошел:", user?.email);
            currentUser = user;
            
            showGameUI();
            updateUserDisplay(user);
            showUserInfo();
            
            if (!isGameInitialized) {
                await initializeGame();
            }
            
            const cloudSave = await loadGameFromCloud();
            if (cloudSave && game) {
                await loadGameStateIntoSave(cloudSave);
                addToLog("💾 Облачное сохранение загружено");
                console.log("💾 Облачное сохранение загружено");
            } else {
                console.log("🆕 Новый игрок - начинаем с нуля");
            }
            
            loadUserStatsFromCloud(user);
        },
        () => {
            console.log("👤 Пользователь не авторизован");
            currentUser = null;
            showAuthUI();
            isGameInitialized = false;
        }
    );
}

async function loadUserStatsFromCloud(user) {
    if (!user) return;
    
    try {
        const users = JSON.parse(localStorage.getItem('corebox_users') || '{}');
        if (users[user.email] && users[user.email].statistics) {
            loadUserStatistics(users[user.email].statistics);
            console.log("📊 Статистика загружена из localStorage");
        } else {
            gameStats.startTime = Date.now();
            gameStats.sessionsCount = 1;
            gameStats.lastSessionDate = new Date().toISOString();
            updateStatisticsDisplay();
        }
    } catch (e) {
        console.warn("Ошибка загрузки статистики:", e);
    }
}

function setupAuthFormHandlers() {
    let isRegisterMode = false;
    
    const loginBtn = document.getElementById('btn-login');
    const registerBtn = document.getElementById('btn-register');
    const toggleModeBtn = document.getElementById('btn-toggle-mode');
    const usernameGroup = document.getElementById('username-group');
    const authTitle = document.querySelector('#authOverlay .auth-header h2');
    const authMessage = document.getElementById('auth-message');
    
    function showMessage(text, isError = true) {
        if (authMessage) {
            authMessage.textContent = text;
            authMessage.className = `auth-message ${isError ? 'error' : 'success'}`;
            setTimeout(() => {
                authMessage.textContent = '';
            }, 5000);
        }
    }
    
    function toggleMode() {
        isRegisterMode = !isRegisterMode;
        
        if (isRegisterMode) {
            if (authTitle) authTitle.textContent = '📝 Регистрация';
            if (usernameGroup) usernameGroup.style.display = 'block';
            if (loginBtn) loginBtn.textContent = '📝 Зарегистрироваться';
            if (registerBtn) registerBtn.style.display = 'none';
            if (toggleModeBtn) toggleModeBtn.textContent = '🔑 Уже есть аккаунт? Войти';
        } else {
            if (authTitle) authTitle.textContent = '🔑 Вход в CoreBox';
            if (usernameGroup) usernameGroup.style.display = 'none';
            if (loginBtn) loginBtn.textContent = '🔑 Войти';
            if (registerBtn) registerBtn.style.display = 'block';
            if (toggleModeBtn) toggleModeBtn.textContent = '✨ Нет аккаунта? Зарегистрироваться';
        }
    }
    
    async function handleLogin() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        
        if (!email || !password) {
            showMessage('Заполните все поля!');
            return;
        }
        
        try {
            const result = await login(email, password);
            if (result.success) {
                showMessage('Вход выполнен успешно!', false);
            } else {
                showMessage(result.error || 'Ошибка входа');
            }
        } catch (e) {
            showMessage(e.message || 'Ошибка входа');
        }
    }
    
    async function handleRegister() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const username = document.getElementById('auth-username').value.trim();
        
        if (!email || !password) {
            showMessage('Заполните все поля!');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Пароль должен быть не менее 6 символов!');
            return;
        }
        
        try {
            const result = await register(email, password, username || email.split('@')[0]);
            if (result.success) {
                showMessage('Регистрация успешна! Теперь войдите.', false);
                toggleMode();
            } else {
                showMessage(result.error || 'Ошибка регистрации');
            }
        } catch (e) {
            showMessage(e.message || 'Ошибка регистрации');
        }
    }
    
    if (loginBtn) loginBtn.onclick = () => isRegisterMode ? handleRegister() : handleLogin();
    if (registerBtn) registerBtn.onclick = handleRegister;
    if (toggleModeBtn) toggleModeBtn.onclick = toggleMode;
    
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const usernameInput = document.getElementById('auth-username');
    
    const onEnter = (e) => {
        if (e.key === 'Enter') {
            if (isRegisterMode) {
                handleRegister();
            } else {
                handleLogin();
            }
        }
    };
    
    if (emailInput) emailInput.addEventListener('keypress', onEnter);
    if (passwordInput) passwordInput.addEventListener('keypress', onEnter);
    if (usernameInput) usernameInput.addEventListener('keypress', onEnter);
}

async function handleLogout() {
    const result = await logout();
    if (result.success) {
        if (game && typeof game.reset_progress === 'function') {
            game.reset_progress();
        }
        isGameInitialized = false;
        prestigeLevel = 0;
        localStorage.removeItem('corebox_prestige_level');
        localStorage.removeItem('corebox_autoclicking');
        location.reload();
    }
}

function showUserInfo() {
    if (currentUser) {
        document.getElementById('userInfo').style.display = 'block';
        updateUserDisplay(currentUser);
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = handleLogout;
        }
    }
}

function initializeCollapsiblePanels() {
    setTimeout(() => {
        const panelTitles = document.querySelectorAll('.panel-title');
        
        panelTitles.forEach((panelTitle, index) => {
            const panel = panelTitle.closest('.panel');
            if (panel && !panel.id) {
                panel.id = `panel-${index}`;
            }
            
            panelTitle.addEventListener('click', (e) => {
                if (e.target.closest('button')) {
                    return;
                }
                
                const pnl = panelTitle.closest('.panel');
                pnl.classList.toggle('collapsed');
                
                const icon = panelTitle.querySelector('.collapse-icon');
                if (icon) {
                    if (pnl.classList.contains('collapsed')) {
                        icon.textContent = '▶';
                    } else {
                        icon.textContent = '▼';
                    }
                }
                
                savePanelStates();
            });
        });
        
        restorePanelStates();
    }, 100);
}

function savePanelStates() {
    const panelStates = {};
    document.querySelectorAll('.panel').forEach(panel => {
        if (panel.id) {
            panelStates[panel.id] = panel.classList.contains('collapsed');
        }
    });
    localStorage.setItem('corebox_panel_states', JSON.stringify(panelStates));
}

function restorePanelStates() {
    try {
        const savedStates = localStorage.getItem('corebox_panel_states');
        if (savedStates) {
            const panelStates = JSON.parse(savedStates);
            
            document.querySelectorAll('.panel').forEach(panel => {
                if (panel.id && panelStates[panel.id]) {
                    panel.classList.add('collapsed');
                    const icon = panel.querySelector('.collapse-icon');
                    if (icon) {
                        icon.textContent = '▶';
                    }
                }
            });
        }
    } catch (e) {
        console.error('Ошибка восстановления состояний панелей:', e);
    }
}

function updatePowerGlow() {
    if (!game) return;
    
    const power = game.get_computational_power();
    const maxPower = game.get_max_computational_power ? game.get_max_computational_power() : 1000;
    const powerPercentage = (power / maxPower) * 100;
    
    const floatingBtn = document.getElementById('floatingMineBtn');
    if (!floatingBtn) return;
    
    floatingBtn.classList.remove('power-low', 'power-medium', 'power-high', 'power-full');
    
    if (powerPercentage >= 80) {
        floatingBtn.classList.add('power-full');
    } else if (powerPercentage >= 50) {
        floatingBtn.classList.add('power-high');
    } else if (powerPercentage >= 20) {
        floatingBtn.classList.add('power-medium');
    } else if (powerPercentage > 0) {
        floatingBtn.classList.add('power-low');
    }
    
    if (power > powerTracker) {
        powerTracker = power;
        gameStats.maxPowerReached = Math.max(gameStats.maxPowerReached, powerTracker);
    }
}

function updateTurbineStatus(rustStats) {
    const heat = rustStats?.turbine_heat ?? 0;
    const isCooling = rustStats?.turbine_cooling ?? false;
    const upgradeLevel = rustStats?.turbine_upgrade_level ?? 0;

    const bar = document.getElementById('turbineHeatBar');
    const label = document.getElementById('turbineHeatLabel');
    const hint = document.getElementById('turbineHeatHint');
    if (!bar || !label) return;

    bar.style.width = `${heat}%`;
    bar.className = 'turbine-fill';

    if (isCooling || heat >= 100) {
        bar.classList.add('turbine-critical');
        label.textContent = `🔥 ПЕРЕГРЕВ: ${heat}% — ОСТЫВАНИЕ...`;
        if (hint) hint.textContent = 'Добыча заблокирована до остывания';
    } else if (heat >= 70) {
        bar.classList.add('turbine-hot');
        label.textContent = `🌡️ Перегрев: ${heat}%`;
        if (hint) hint.textContent = 'Турбина сильно нагрета!';
    } else if (heat >= 40) {
        bar.classList.add('turbine-warm');
        label.textContent = `🌡️ Перегрев: ${heat}%`;
        if (hint) hint.textContent = `Уровень турбины: ${upgradeLevel}`;
    } else {
        bar.classList.add('turbine-cool');
        label.textContent = `🌡️ Перегрев: ${heat}%`;
        if (hint) hint.textContent = `Уровень турбины: ${upgradeLevel}`;
    }
}

function updateNeuroStatus(rustStats = null) {
    if (!game) return;
    
    try {
        if (!rustStats) {
            const statsJson = game.get_statistics();
            if (statsJson) rustStats = JSON.parse(statsJson);
        }
        if (rustStats) {
            const neuroElement = document.getElementById('neuroStatus');
            const progressElement = document.getElementById('neuroProgress');
            
            if (neuroElement) {
                const consciousness = rustStats.neuro_consciousness || 0;
                const evolution = rustStats.neuro_evolution || 0;
                
                neuroElement.textContent = `${consciousness.toFixed(1)}% (Ур. ${evolution})`;
                
                if (progressElement) {
                    const width = Math.min(consciousness, 100);
                    progressElement.style.width = `${width}%`;
                    
                    progressElement.className = 'neuro-progress';
                    if (consciousness >= 80) {
                        progressElement.classList.add('level-high');
                    } else if (consciousness >= 50) {
                        progressElement.classList.add('level-medium');
                    } else if (consciousness >= 20) {
                        progressElement.classList.add('level-low');
                    } else {
                        progressElement.classList.add('level-basic');
                    }
                }
            }
            
            const aiModeElement = document.getElementById('aiMode');
            if (aiModeElement) {
                aiModeElement.textContent = rustStats.current_ai_mode || '⚙️ Обычный';
            }
            
            const warningElement = document.getElementById('attackWarning');
            if (warningElement) {
                if (rustStats.attack_warning) {
                    const wasHidden = warningElement.style.display === 'none';
                    warningElement.style.display = 'block';
                    if (wasHidden) playSound('error');
                    if (rustStats.attack_warning_faction) {
                        warningElement.innerHTML = `⚠️ ${rustStats.attack_warning} от ${rustStats.attack_warning_faction}`;
                    } else {
                        warningElement.textContent = `⚠️ ${rustStats.attack_warning}`;
                    }
                } else {
                    warningElement.style.display = 'none';
                }
            }
            
            const miningDebuff = document.getElementById('miningDebuff');
            if (miningDebuff) {
                if (rustStats.mining_debuff_remaining > 0) {
                    miningDebuff.style.display = 'block';
                    miningDebuff.textContent = `🔧 Саботаж добычи: ${rustStats.mining_debuff_remaining} тиков`;
                } else {
                    miningDebuff.style.display = 'none';
                }
            }
            
            const autoclickDebuff = document.getElementById('autoclickDebuff');
            if (autoclickDebuff) {
                if (rustStats.autoclick_debuff_remaining > 0) {
                    autoclickDebuff.style.display = 'block';
                    autoclickDebuff.textContent = `😨 Псих. атака: ${rustStats.autoclick_debuff_remaining} тиков`;
                } else {
                    autoclickDebuff.style.display = 'none';
                }
            }
            
            const defenseDebuff = document.getElementById('defenseDebuff');
            if (defenseDebuff) {
                if (rustStats.defense_debuff_remaining > 0) {
                    defenseDebuff.style.display = 'block';
                    defenseDebuff.textContent = `🛡️ Защита повреждена: ${rustStats.defense_debuff_remaining} ночей`;
                } else {
                    defenseDebuff.style.display = 'none';
                }
            }
            
            updateAttackHistory(rustStats.attack_history || []);
            updateFactionPanel(rustStats.rebel_factions || [], rustStats.last_attacking_faction || '');
            
            updateUpgradeDisplay(rustStats);
        }
    } catch (e) {
        console.warn('Не удалось обновить нейро-статус:', e);
    }
}

function updateUpgradeDisplay(rustStats) {
    if (!rustStats) return;
    
    const critLevel = rustStats.crit_level || 0;
    const coolingLevel = rustStats.cooling_level || 0;
    const powerTier = rustStats.power_tier || 0;
    
    const critLevelEl = document.getElementById('critLevel');
    if (critLevelEl) critLevelEl.textContent = `Ур. ${critLevel}/10 (+${critLevel * 2}% крит)`;
    
    const coolingLevelEl = document.getElementById('coolingLevel');
    if (coolingLevelEl) coolingLevelEl.textContent = `Ур. ${coolingLevel}/10 (-${coolingLevel * 15}% нагрев)`;
    
    const powerTierEl = document.getElementById('powerTier');
    if (powerTierEl) powerTierEl.textContent = `Тир ${powerTier} | +${powerTier + 1} мощности/клик`;
    
    const critCost = (critLevel + 1) * 2 + 4;
    const critCostEl = document.getElementById('critCost');
    if (critCostEl) critCostEl.textContent = `Стоимость: по ${critCost} каждого ресурса`;
    
    const coolingCost = 500 * (coolingLevel + 1);
    const coolingCostEl = document.getElementById('coolingCost');
    if (coolingCostEl) coolingCostEl.textContent = `Стоимость: ${coolingCost} угля`;
}

function updateAttackHistory(history) {
    const container = document.getElementById('attackHistory');
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<div class="history-empty">Атак ещё не было</div>';
        return;
    }
    
    container.innerHTML = history.slice().reverse().map(record => `
        <div class="attack-record ${record.was_defended ? 'defended' : 'failed'}">
            <span class="attack-faction">${escapeHtml(record.faction)}</span>
            <span class="attack-type">${escapeHtml(record.attack_type)}</span>
            <span class="attack-result">${record.was_defended ? '✅' : '❌'} ${escapeHtml(record.result)}</span>
        </div>
    `).join('');
}

function updateFactionPanel(factions, lastAttacker) {
    const container = document.getElementById('factionPanel');
    if (!container || !Array.isArray(factions)) return;
    
    if (factions.length === 0) {
        container.innerHTML = '<div class="faction-empty">Нет данных о фракциях</div>';
        return;
    }
    
    container.innerHTML = factions.map(info => {
        const isActive = info.includes(lastAttacker) && lastAttacker !== '';
        return `<div class="faction-row ${isActive ? 'faction-active' : ''}">${escapeHtml(info)}</div>`;
    }).join('');
}

function initializeSounds() {
    sounds.click = new Audio('music/click.mp3');
    sounds.error = new Audio('music/error.mp3');
    sounds.upgrade = new Audio('music/upgrade.mp3');
    
    Object.values(sounds).forEach(sound => {
        if (sound) {
            sound.preload = 'auto';
            sound.volume = 0.3;
        }
    });
    
    console.log('🔊 Звуки загружены');
}

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(e => {
            console.warn(`Не удалось воспроизвести звук ${soundName}:`, e);
        });
    }
}

function setupLogObserver() {
    const logBox = document.getElementById('logBox');
    if (!logBox) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('log-entry')) {
                        checkLogMessage(node);
                    }
                });
            }
        });
    });
    
    observer.observe(logBox, {
        childList: true
    });
    
    console.log('👁️ Наблюдатель за логом запущен');
}

function checkLogMessage(logEntry) {
    if (!logEntry) return;
    
    const message = logEntry.textContent || '';
    
    if (message.includes('❌ Система неактивна!')) {
        playSound('error');
        
        const floatingBtn = document.getElementById('floatingMineBtn');
        if (floatingBtn && !floatingBtn.classList.contains('error-shake')) {
            floatingBtn.classList.add('error-shake');
            setTimeout(() => {
                floatingBtn.classList.remove('error-shake');
            }, 500);
        }
    }
}

function getCritChance(rustStats) {
    const baseCrit = 0.05;
    const evolution = rustStats?.neuro_evolution || 0;
    const evolutionBonus = Math.min(evolution / 500, 0.1);
    const prestigeBonus = getPrestigeBonus().critBonus;
    const critModuleBonus = (rustStats?.crit_level || 0) * 0.02;
    
    return baseCrit + evolutionBonus + prestigeBonus + critModuleBonus;
}

function getComboMultiplier() {
    const evolution = game?.get_neuro_evolution ? game.get_neuro_evolution() : 0;
    const evolutionBonus = Math.min(evolution / 200, 1.5);
    const prestigeBonus = getPrestigeBonus().comboBonus;
    
    return 1 + evolutionBonus + prestigeBonus;
}

function updateStatsFromGame(rustStats = null) {
    if (!game || !currentUser) return;
    
    try {
        if (!rustStats) {
            const statsJson = game.get_statistics();
            if (statsJson) rustStats = JSON.parse(statsJson);
        }
        if (rustStats) {
            const currentPower = game.get_computational_power() || 0;

            if (currentPower > gameStats.maxPowerReached) {
                gameStats.maxPowerReached = currentPower;
            }

            if (currentPower > powerTracker) {
                powerTracker = currentPower;
            }
            
            const rustClicks = rustStats.total_clicks || 0;
            if (rustClicks > clickCounter) {
                const diff = rustClicks - clickCounter;
                gameStats.totalClicks += diff;
                clickCounter = rustClicks;
            }
            
            if (!lastRustStats) {
                lastRustStats = rustStats;
                return;
            }
            
            const diff = {
                nights_survived: Math.max(0, rustStats.nights_survived - (lastRustStats.nights_survived || 0)),
                rebel_attacks: Math.max(0, rustStats.rebel_attacks - (lastRustStats.rebel_attacks || 0)),
                attacks_defended: Math.max(0, rustStats.attacks_defended - (lastRustStats.attacks_defended || 0)),
                coal_mined: Math.max(0, rustStats.coal_mined - (lastRustStats.coal_mined || 0)),
                trash_mined: Math.max(0, rustStats.trash_mined - (lastRustStats.trash_mined || 0)),
                plasma_mined: Math.max(0, rustStats.plasma_mined - (lastRustStats.plasma_mined || 0)),
                ore_mined: Math.max(0, (rustStats.ore_mined || 0) - (lastRustStats.ore_mined || 0)),
                coal_burned: Math.max(0, (rustStats.coal_burned || 0) - (lastRustStats.coal_burned || 0)),
                coal_stolen: Math.max(0, (rustStats.coal_stolen || 0) - (lastRustStats.coal_stolen || 0))
            };
            
            gameStats.nightsSurvived += diff.nights_survived;
            gameStats.rebelAttacks += diff.rebel_attacks;
            gameStats.attacksDefended += diff.attacks_defended;
            gameStats.coalMined += diff.coal_mined;
            gameStats.trashMined += diff.trash_mined;
            gameStats.plasmaMined += diff.plasma_mined;
            gameStats.oreMined = (gameStats.oreMined || 0) + diff.ore_mined;
            gameStats.coalBurned += diff.coal_burned;
            gameStats.coalStolen += diff.coal_stolen;
            
            lastRustStats = rustStats;
            
            scheduleSave();
            
            if (document.getElementById('statistics-section')?.style.display !== 'none') {
                updateStatisticsDisplay();
            }
        }
    } catch (e) {
        console.warn('Не удалось обновить статистику из игры:', e);
    }
}

function handleClick() {
    if (!game) return;
    
    const now = Date.now();
    
    let rustStats = null;
    try {
        const statsJson = game.get_statistics();
        if (statsJson) rustStats = JSON.parse(statsJson);
    } catch(e) {}
    
    const isSystemActive = rustStats && (rustStats.coal_enabled || rustStats.is_day);
    const isOverheated = rustStats && rustStats.turbine_heat >= 100;
    const canMine = isSystemActive && !isOverheated;
    
    if (!canMine) {
        game.add_manual_click();
        return;
    }
    
    if (now - lastClickTime < 1000) {
        comboCount++;
    } else {
        comboCount = 1;
    }
    lastClickTime = now;
    
    if (comboCount > 1) {
        showFloatingText(`x${comboCount}`, window.innerWidth / 2 + 50, window.innerHeight / 2 - 30);
    }
    
    const critChance = getCritChance(rustStats);
    const comboMultiplier = getComboMultiplier();
    const comboBonus = Math.floor(comboCount / 5) * comboMultiplier;
    const actualClicks = 1 + comboBonus;
    
    const isCrit = Math.random() < critChance;
    
    playSound('click');
    
    clickCounter++;
    gameStats.totalClicks = (gameStats.totalClicks || 0) + actualClicks;
    
    if (isCrit) {
        showFloatingText('💥 CRIT!', window.innerWidth / 2, window.innerHeight / 2 - 50);
        for (let i = 0; i < actualClicks * 2; i++) {
            game.add_manual_click();
        }
    } else {
        for (let i = 0; i < actualClicks; i++) {
            game.add_manual_click();
        }
    }
    
    updatePowerGlow();
    
    setTimeout(() => {
        if (Date.now() - lastClickTime > 1500) {
            comboCount = 0;
        }
    }, 1500);
}

function toggleAutoClicking() {
    if (!game) return;
    
    if (isAutoClicking) {
        game.stop_auto_clicking();
        isAutoClicking = false;
        document.getElementById('floatingMineBtn').classList.remove('auto-clicking');
        document.getElementById('autoClickStatus').textContent = 'ОТКЛЮЧЕНА';
        document.getElementById('autoClickStatus').classList.remove('auto-clicking-status');
        localStorage.setItem('corebox_autoclicking', 'false');
    } else {
        if (game.get_computational_power() > 0) {
            game.start_auto_clicking();
            isAutoClicking = true;
            document.getElementById('floatingMineBtn').classList.add('auto-clicking');
            document.getElementById('autoClickStatus').textContent = 'АКТИВНА';
            document.getElementById('autoClickStatus').classList.add('auto-clicking-status');
            localStorage.setItem('corebox_autoclicking', 'true');
            playSound('click');
        } else {
            const floatingBtn = document.getElementById('floatingMineBtn');
            floatingBtn.classList.add('no-power');
            playSound('error');
            setTimeout(() => {
                floatingBtn.classList.remove('no-power');
            }, 800);
        }
    }
    updatePowerGlow();
}

function setupLongPressHandlers() {
    const floatingMineBtn = document.getElementById('floatingMineBtn');
    let pressTimer;

    function startPressTimer() {
        pressTimer = setTimeout(() => {
            toggleAutoClicking();
        }, 600);
    }

    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    if (floatingMineBtn) {
        floatingMineBtn.addEventListener('mousedown', startPressTimer);
        floatingMineBtn.addEventListener('mouseup', clearPressTimer);
        floatingMineBtn.addEventListener('mouseleave', clearPressTimer);

        floatingMineBtn.addEventListener('touchstart', startPressTimer);
        floatingMineBtn.addEventListener('touchend', clearPressTimer);
        floatingMineBtn.addEventListener('touchcancel', clearPressTimer);
    }
}

function switchMainTab(tabName) {
    const tabContents = [
        'inventory-tab',
        'upgrades-tab', 
        'trade-tab',
        'quests-tab',
        'command-tab',
        'craft-tab',
        'design-tab',
        'fleet-tab'
    ];
    
    tabContents.forEach(tabId => {
        const element = document.getElementById(tabId);
        if (element) {
            element.style.display = 'none';
            element.classList.remove('active');
        }
    });
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.style.display = 'block';
        activeTab.classList.add('active');
    }
    
    const tabButtons = [
        'inventory-tab-btn',
        'upgrades-tab-btn',
        'trade-tab-btn', 
        'quests-tab-btn',
        'command-tab-btn',
        'craft-tab-btn',
        'design-tab-btn',
        'fleet-tab-btn'
    ];
    
    tabButtons.forEach(tabId => {
        const button = document.getElementById(tabId);
        if (button) {
            if (tabId === `${tabName}-tab-btn`) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    });
    
    if (tabName === 'craft') {
        updateCraftTab();
    } else if (tabName === 'design') {
        updateDesignTab();
    } else if (tabName === 'fleet') {
        updateFleetTab();
    } else if (tabName === 'trade') {
        renderTradeTab();
    }
}

function updateCraftTab() {
    if (!game) return;
    
    const craftContainer = document.getElementById('craftContainer');
    if (!craftContainer) return;
    
    try {
        const statsJson = game.get_statistics();
        if (statsJson) {
            const rustStats = JSON.parse(statsJson);
            craftModule.syncFromStats(rustStats);
            craftContainer.innerHTML = craftModule.renderCraftUI();
            craftModule.setupEventListeners(craftContainer);
        }
    } catch (e) {
        console.error('Ошибка обновления крафта:', e);
    }
}

function updateDesignTab() {
    if (!game) return;
    
    const designContainer = document.getElementById('designContainer');
    if (!designContainer) return;
    
    try {
        const power = game.get_computational_power();
        designModule.updateComputationalPower(power);
        designContainer.innerHTML = designModule.renderDesignUI();
        designModule.setupEventListeners(designContainer);
    } catch (e) {
        console.error('Ошибка обновления разработки:', e);
    }
}

function updateFleetTab() {
    const fleetContainer = document.getElementById('fleetContainer');
    if (!fleetContainer) return;
    
    try {
        fleetContainer.innerHTML = fleetModule.renderFleetUI();
        fleetModule.setupEventListeners(fleetContainer);
    } catch (e) {
        console.error('Ошибка обновления флота:', e);
    }
}

// ========== ТОРГОВЛЯ ==========

const BASE_TRADES = [
    { id: 'coal_to_ore', from: 'coal', fromAmt: 3, to: 'ore', toAmt: 1 },
    { id: 'ore_to_coal', from: 'ore', fromAmt: 1, to: 'coal', toAmt: 2 },
    { id: 'ore_to_chips', from: 'ore', fromAmt: 50, to: 'chips', toAmt: 1 },
    { id: 'chips_to_ore', from: 'chips', fromAmt: 1, to: 'ore', toAmt: 30 },
    { id: 'coal_to_plasma', from: 'coal', fromAmt: 80, to: 'plasma', toAmt: 1 },
    { id: 'plasma_to_coal', from: 'plasma', fromAmt: 1, to: 'coal', toAmt: 60 },
    { id: 'chips_to_plasma', from: 'chips', fromAmt: 5, to: 'plasma', toAmt: 1 },
    { id: 'plasma_to_chips', from: 'plasma', fromAmt: 1, to: 'chips', toAmt: 4 },
];

const RES_ICON = { coal: '🪨', ore: '⛏️', chips: '🎛️', plasma: '⚡', trash: '🗑️' };
const RES_NAME = { coal: 'уголь', ore: 'руда', chips: 'чип', plasma: 'плазма' };

let activeDiscount = null;
let lastDiscountNight = -1;

function rollNightDiscount(nightIndex) {
    if (nightIndex === lastDiscountNight) return;
    lastDiscountNight = nightIndex;
    activeDiscount = null;
    
    if (Math.random() < 0.25) {
        const idx = Math.floor(Math.random() * BASE_TRADES.length);
        activeDiscount = { tradeId: BASE_TRADES[idx].id, nightIndex };
        const t = BASE_TRADES[idx];
        addToLog(`🏷️ Ночная скидка 50%: ${RES_ICON[t.from]}→${RES_ICON[t.to]}`);
        renderTradeTab();
    }
}

function onDayStarted() {
    if (activeDiscount) {
        activeDiscount = null;
        renderTradeTab();
    }
}

function renderTradeTab() {
    const container = document.getElementById('buyItemsContainer');
    if (!container || !game) return;
    
    let rustStats = null;
    try {
        const j = game.get_statistics();
        if (j) rustStats = JSON.parse(j);
    } catch(e) {}
    
    const inv = {
        coal: rustStats?.coal_inventory || 0,
        ore: rustStats?.ore_inventory || 0,
        chips: rustStats?.chips_inventory || 0,
        plasma: rustStats?.plasma_inventory || 0,
    };
    
    container.innerHTML = BASE_TRADES.map(t => {
        const hasDisc = activeDiscount?.tradeId === t.id;
        const cost = hasDisc ? Math.max(1, Math.ceil(t.fromAmt * 0.5)) : t.fromAmt;
        const canAfford = inv[t.from] >= cost;
        const discBadge = hasDisc ? `<span class='disc-badge'>-50% 🏷️</span>` : '';
        
        return `<div class='trade-card ${canAfford ? '' : 'trade-disabled'}'>
            ${discBadge}
            <div class='trade-from'>${RES_ICON[t.from]} ${cost} <small>${RES_NAME[t.from]}</small></div>
            <div class='trade-arr'>→</div>
            <div class='trade-to'>${RES_ICON[t.to]} ${t.toAmt} <small>${RES_NAME[t.to]}</small></div>
            <div class='trade-have'>Есть: ${inv[t.from]}</div>
            <button onclick='window.executeTrade && window.executeTrade("${t.id}")' ${canAfford ? '' : 'disabled'}>ОБМЕНЯТЬ</button>
        </div>`;
    }).join('');
}

window.executeTrade = function(tradeId) {
    if (!game) return;
    const t = BASE_TRADES.find(x => x.id === tradeId);
    if (!t) return;
    const hasDisc = activeDiscount?.tradeId === tradeId;
    const cost = hasDisc ? Math.max(1, Math.ceil(t.fromAmt * 0.5)) : t.fromAmt;
    
    try {
        game.subtract_resource(t.from, cost);
        game.add_resource(t.to, t.toAmt);
        addToLog(`🔄 Обмен: -${cost} ${RES_ICON[t.from]} → +${t.toAmt} ${RES_ICON[t.to]}`);
        playSound('upgrade');
        renderTradeTab();
        
        scheduleCloudSave(getCurrentGameState());
    } catch(e) {
        addToLog('❌ Недостаточно ресурсов');
    }
};

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

function setupEventListeners() {
    console.log('=== НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ===');
    
    const floatingBtn = document.getElementById('floatingMineBtn');
    if (floatingBtn) {
        floatingBtn.addEventListener('click', handleClick);
    } else {
        console.error('Кнопка floatingMineBtn не найдена!');
    }
    
    setupLongPressHandlers();

    const tabButtons = [
        { id: 'inventory-tab-btn', tab: 'inventory' },
        { id: 'upgrades-tab-btn', tab: 'upgrades' },
        { id: 'trade-tab-btn', tab: 'trade' },
        { id: 'quests-tab-btn', tab: 'quests' },
        { id: 'command-tab-btn', tab: 'command' },
        { id: 'craft-tab-btn', tab: 'craft' },
        { id: 'design-tab-btn', tab: 'design' },
        { id: 'fleet-tab-btn', tab: 'fleet' }
    ];
    
    tabButtons.forEach(({ id, tab }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                switchMainTab(tab);
            });
        } else {
            console.error(`Кнопка вкладки ${id} не найдена!`);
        }
    });

    document.addEventListener('click', (event) => {
        if (!game) return;
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const resource = target.getAttribute('data-resource');

        if (action === 'buy' || action === 'sell' || action === 'toggle-coal') {
            playSound('click');
        }

        if (action === 'buy' && resource) game.buy_resource(resource);
        else if (action === 'sell' && resource) game.sell_resource(resource);
        else if (action === 'toggle-coal') game.toggle_coal();
    });

    const upgradeMiningBtn = document.getElementById('upgradeMiningBtn');
    if (upgradeMiningBtn) {
        upgradeMiningBtn.addEventListener('click', () => {
            playSound('upgrade');
            game.upgrade_mining();
            scheduleCloudSave(getCurrentGameState());
        });
    }
    
    const upgradeDefenseBtn = document.getElementById('upgradeDefenseBtn');
    if (upgradeDefenseBtn) {
        upgradeDefenseBtn.addEventListener('click', () => {
            playSound('upgrade');
            game.activate_defense();
            scheduleCloudSave(getCurrentGameState());
        });
    }
    
    const upgradeDefenseLevelBtn = document.getElementById('upgradeDefenseLevelBtn');
    if (upgradeDefenseLevelBtn) {
        upgradeDefenseLevelBtn.addEventListener('click', () => {
            playSound('upgrade');
            game.upgrade_defense();
            scheduleCloudSave(getCurrentGameState());
        });
    }
    
    const upgradeTurbineBtn = document.getElementById('upgradeTurbineBtn');
    if (upgradeTurbineBtn) {
        upgradeTurbineBtn.addEventListener('click', () => {
            if (game.upgrade_turbine()) {
                playSound('upgrade');
                scheduleCloudSave(getCurrentGameState());
            }
        });
    }
    
    const upgradeCritBtn = document.getElementById('upgradeCritBtn');
    if (upgradeCritBtn) {
        upgradeCritBtn.addEventListener('click', () => {
            if (game.upgrade_crit_module) {
                game.upgrade_crit_module();
                playSound('upgrade');
                scheduleCloudSave(getCurrentGameState());
            }
        });
    }
    
    const upgradeCoolingBtn = document.getElementById('upgradeCoolingBtn');
    if (upgradeCoolingBtn) {
        upgradeCoolingBtn.addEventListener('click', () => {
            if (game.upgrade_cooling_module) {
                game.upgrade_cooling_module();
                playSound('upgrade');
                scheduleCloudSave(getCurrentGameState());
            }
        });
    }

    const buyModeBtn = document.getElementById('buyModeBtn');
    if (buyModeBtn) {
        buyModeBtn.addEventListener('click', () => {
            document.getElementById('buyItemsContainer').style.display = 'grid';
            document.getElementById('sellItemsContainer').style.display = 'none';
            document.getElementById('buyModeBtn').classList.add('active');
            document.getElementById('sellModeBtn').classList.remove('active');
            renderTradeTab();
            playSound('click');
        });
    }
    
    const sellModeBtn = document.getElementById('sellModeBtn');
    if (sellModeBtn) {
        sellModeBtn.addEventListener('click', () => {
            document.getElementById('buyItemsContainer').style.display = 'none';
            document.getElementById('sellItemsContainer').style.display = 'grid';
            document.getElementById('buyModeBtn').classList.remove('active');
            document.getElementById('sellModeBtn').classList.add('active');
            const sellContainer = document.getElementById('sellItemsContainer');
            if (sellContainer) sellContainer.innerHTML = '<div class="trade-info">Продажа временно недоступна</div>';
            playSound('click');
        });
    }

    const clearLogBtn = document.getElementById('clearLogBtn');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            if (game && typeof game.clear_log === 'function') {
                game.clear_log();
            }
            playSound('click');
        });
    }

    const systemStatusTab = document.getElementById('system-status-tab');
    if (systemStatusTab) {
        systemStatusTab.addEventListener('click', () => {
            switchStatusTab('system-status');
            playSound('click');
        });
    }

    const statisticsTab = document.getElementById('statistics-tab');
    if (statisticsTab) {
        statisticsTab.addEventListener('click', () => {
            switchStatusTab('statistics');
            updateStatsFromGame();
            updateNeuroStatus();
            playSound('click');
        });
    }
    
    const leaderboardTab = document.getElementById('leaderboard-tab');
    if (leaderboardTab) {
        leaderboardTab.addEventListener('click', () => {
            switchStatusTab('leaderboard');
            loadLeaderboard();
            playSound('click');
        });
    }
    
    const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
    if (refreshLeaderboardBtn) {
        refreshLeaderboardBtn.addEventListener('click', () => {
            loadLeaderboard();
            playSound('click');
        });
    }

    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', () => {
            updateStatisticsDisplay();
            playSound('click');
        });
    }
    
    const resetStatsBtn = document.getElementById('resetStatsBtn');
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', () => {
            const confirmed = confirm('Вы уверены, что хотите сбросить статистику? Это действие нельзя отменить.');
            if (confirmed) {
                playSound('error');
                const event = new CustomEvent('resetUserStats', { detail: { stats: gameStats } });
                document.dispatchEvent(event);
            } else {
                playSound('click');
            }
        });
    }

    const prestigeBtn = document.getElementById('prestigeBtn');
    if (prestigeBtn) {
        prestigeBtn.addEventListener('click', () => {
            prestigeReset();
            playSound('click');
        });
    }

    const autoScrollBtn = document.getElementById('autoScrollBtn');
    if (autoScrollBtn) {
        autoScrollBtn.addEventListener('click', () => {
            playSound('click');
            const logBox = document.getElementById('logBox');
            if (logBox) {
                logBox.scrollTop = logBox.scrollHeight;
            }
        });
    }
    
    function showNotification(message, type, duration = 2000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    document.addEventListener('craftResult', function(e) {
        if (e.detail) {
            showNotification(e.detail.success ? e.detail.message : e.detail.error, e.detail.success ? 'success' : 'error', 2000);
            
            if (e.detail.success && e.detail.recipe && e.detail.recipe.result && e.detail.recipe.result.type === 'ship') {
                fleetModule.addShip(e.detail.recipe.result.subtype);
                scheduleCloudSave(getCurrentGameState());
            }
        }
    });
    
    document.addEventListener('designResult', function(e) {
        if (e.detail) {
            showNotification(e.detail.success ? e.detail.message : e.detail.error, e.detail.success ? 'success' : 'error', 2000);
            if (e.detail.success) scheduleCloudSave(getCurrentGameState());
        }
    });
    
    document.addEventListener('fleetAction', function(e) {
        if (e.detail) {
            showNotification(e.detail.success ? e.detail.message : e.detail.error, e.detail.success ? 'success' : 'error', 2000);
            if (e.detail.success) scheduleCloudSave(getCurrentGameState());
        }
    });
}

function saveCurrentUserStatistics() {
    if (!currentUser) return;
    
    const users = JSON.parse(localStorage.getItem('corebox_users') || '{}');
    if (!users[currentUser.email]) {
        users[currentUser.email] = {};
    }
    users[currentUser.email].statistics = {
        totalClicks: gameStats.totalClicks,
        maxPowerReached: gameStats.maxPowerReached,
        nightsSurvived: gameStats.nightsSurvived,
        rebelAttacks: gameStats.rebelAttacks,
        attacksDefended: gameStats.attacksDefended,
        coalMined: gameStats.coalMined,
        trashMined: gameStats.trashMined,
        plasmaMined: gameStats.plasmaMined,
        oreMined: gameStats.oreMined || 0,
        coalBurned: gameStats.coalBurned,
        coalStolen: gameStats.coalStolen,
        playTime: gameStats.playTime,
        sessionsCount: gameStats.sessionsCount,
        lastSessionDate: gameStats.lastSessionDate
    };
    localStorage.setItem('corebox_users', JSON.stringify(users));
}

async function initializeGame() {
    if (isGameInitialized) return;
    
    try {
        console.log('=== ИНИЦИАЛИЗАЦИЯ ИГРЫ ===');
        
        await init();
        await loadConfig();

        game = start_game();
        window.game = game;

        if (!gameStats.startTime) {
            gameStats.startTime = Date.now();
        }
        
        clickCounter = 0;
        powerTracker = 0;
        
        console.log('Инициализация craftModule...');
        craftModule.init(game);
        
        console.log('Инициализация designModule...');
        designModule.init(game);
        
        console.log('Инициализация fleetModule...');
        fleetModule.init(game);
        
        initializeSounds();
        
        initStatistics();
        
        setupEventListeners();
        initializeCollapsiblePanels();
        updatePowerGlow();
        
        setupLogObserver();

        isGameInitialized = true;

        setInterval(() => {
            if (!game) return;
            
            game.game_loop();
            updatePowerGlow();
            
            let rustStats = null;
            try {
                const statsJson = game.get_statistics();
                if (statsJson) rustStats = JSON.parse(statsJson);
            } catch(e) {}
            
            if (rustStats) {
                updateStatsFromGame(rustStats);
                updateNeuroStatus(rustStats);
                updateTurbineStatus(rustStats);
                updateUpgradeDisplay(rustStats);
                
                craftModule.syncFromStats(rustStats);
                
                const evolution = rustStats.neuro_evolution || 0;
                craftModule.aiProductionBonus = Math.min(30, evolution * 1.5);
                designModule.aiResearchBonus = Math.floor((rustStats.neuro_consciousness || 0) / 20);
                
                const fleetCombat = fleetModule.getFleetDefenseContribution();
                const fleetRecon = fleetModule.getScoutReconBonus();
                const fleetCargo = fleetModule.getCargoMiningBonus();
                
                try {
                    if (typeof game.set_fleet_defense_bonus === 'function' && fleetCombat > 0) {
                        game.set_fleet_defense_bonus(Math.floor(fleetCombat / 50));
                    }
                    if (typeof game.set_fleet_cargo_bonus === 'function' && fleetCargo > 0) {
                        game.set_fleet_cargo_bonus(fleetCargo);
                    }
                } catch(e) {}
                
                // Применяем бонус от стратегического режима ИИ
                if (rustStats.current_ai_mode) {
                    const mode = rustStats.current_ai_mode;
                    
                    if (mode.includes('Стратегическое отступление') || mode.includes('консервирует')) {
                        // Режим отступления: усиление защиты
                        if (typeof game.set_temporary_defense_bonus === 'function') {
                            game.set_temporary_defense_bonus(40);
                        }
                    } else if (mode.includes('Предсказание') || mode.includes('угроза')) {
                        fleetModule.setAlertMode(true);
                    } else {
                        fleetModule.setAlertMode(false);
                        if (typeof game.set_temporary_defense_bonus === 'function') {
                            game.set_temporary_defense_bonus(0);
                        }
                    }
                } else {
                    fleetModule.setAlertMode(false);
                }
                
                const history = rustStats.attack_history || [];
                if (history.length > 0) {
                    const last = history[history.length - 1];
                    if (last && !last.was_defended) {
                        const damageResult = fleetModule.damageRandomCombatShip(last.attack_type);
                        if (damageResult) {
                            const logBox = document.getElementById('logBox');
                            if (logBox) {
                                const entry = document.createElement('div');
                                entry.className = 'log-entry attack-damage';
                                entry.textContent = `⚔️ ${damageResult.shipName} получил ${damageResult.damage} урона! (${damageResult.newHealth}/${damageResult.maxHealth})`;
                                logBox.appendChild(entry);
                                
                                while (logBox.children.length > 50) {
                                    logBox.removeChild(logBox.firstChild);
                                }
                                
                                logBox.scrollTop = logBox.scrollHeight;
                            }
                        }
                    }
                }
                
                const turbineLevel = rustStats.turbine_upgrade_level ?? 0;
                const turbineLevelEl = document.getElementById('turbineLevel');
                if (turbineLevelEl) turbineLevelEl.textContent = turbineLevel;
                
                const turbineCostEl = document.getElementById('turbineCost');
                if (turbineCostEl) {
                    const oreCost = 30 + turbineLevel * 20;
                    const chipsCost = 5 + turbineLevel * 3;
                    turbineCostEl.textContent = `${oreCost}⛏️ + ${chipsCost}🎛️`;
                }
                
                const turbineBtn = document.getElementById('upgradeTurbineBtn');
                if (turbineBtn) turbineBtn.disabled = turbineLevel >= 5;
                
                if (document.getElementById('craft-tab')?.classList.contains('active')) {
                    const craftContainerEl = document.getElementById('craftContainer');
                    if (craftContainerEl) craftModule.refreshUI(craftContainerEl);
                }
                if (document.getElementById('design-tab')?.classList.contains('active')) {
                    const designContainerEl = document.getElementById('designContainer');
                    if (designContainerEl) designModule.refreshUI(designContainerEl);
                }
                if (document.getElementById('fleet-tab')?.classList.contains('active')) {
                    const fleetContainerEl = document.getElementById('fleetContainer');
                    if (fleetContainerEl) {
                        fleetContainerEl.innerHTML = fleetModule.renderFleetUI();
                        fleetModule.setupEventListeners(fleetContainerEl);
                    }
                }
                
                if (rustStats.nights_survived !== undefined) {
                    rollNightDiscount(rustStats.nights_survived);
                }
                
                // Дополнительный тик для автокликера если Rust не делает сам
                if (isAutoClicking && game.get_computational_power() > 0 && rustStats && rustStats.is_ai_active) {
                    const power = game.get_computational_power();
                    const powerPerAuto = 1;
                    if (power >= powerPerAuto) {
                        game.subtract_power(powerPerAuto);
                        // Принудительная добыча (используем ручной клик как fallback)
                        game.add_manual_click();
                    }
                }
                
                if (currentUser && rustStats) {
                    _autoSaveCounter = (_autoSaveCounter || 0) + 1;
                    if (_autoSaveCounter >= 30) {
                        _autoSaveCounter = 0;
                        saveGameToCloud(rustStats);
                    }
                }
            }
            
            randomEventTimer++;
            if (randomEventTimer >= 30) {
                randomEventTimer = 0;
                const evolution = rustStats?.neuro_evolution || 0;
                const eventBonus = Math.min(evolution / 1000, 0.05) + getPrestigeBonus().eventBonus;
                if (Math.random() < 0.03 + eventBonus) triggerRandomEvent();
            }
            
            if (!isAutoClicking && Date.now() - lastClickTime > 1500) comboCount = 0;
        }, 1000);

        setInterval(loadConfig, 30000);

        console.log("🎮 Игра успешно запущена!");
    } catch (error) {
        console.error("❌ Ошибка при запуске игры:", error);
    }
}

function hashConfig(configStr) {
    let hash = 0, i, chr;
    if (configStr.length === 0) return hash;
    for (i = 0; i < configStr.length; i++) {
        chr   = configStr.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

async function loadConfig() {
    try {
        const resp = await fetch("config.json?_" + Date.now());
        const configStr = await resp.text();
        const currentHash = hashConfig(configStr);

        if (currentHash !== lastConfigHash) {
            lastConfigHash = currentHash;
            
            try {
                const result = apply_config_from_admin(configStr);
                console.log("✅ Конфиг применен:", result);
            } catch (e) {
                console.error("❌ Ошибка применения конфига:", e);
                return;
            }
            
            if (game) {
                game.reload_config();
            }
        }
    } catch (e) {
        console.error("Не удалось загрузить config.json:", e);
    }
}

window.addEventListener('beforeunload', function() {
    if (currentUser && game) {
        const gameState = getCurrentGameState();
        if (gameState) {
            localStorage.setItem('corebox_save_backup', JSON.stringify(gameState));
        }
        saveCurrentUserStatistics();
    }
});

setInterval(() => {
    if (currentUser && gameStats) {
        scheduleSave();
    }
}, 30000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

document.addEventListener('resetUserStats', function(e) {
    if (e.detail && currentUser) {
        saveCurrentUserStatistics();
    }
});

document.addEventListener('gameEvent', function(e) {
    if (e.detail && currentUser) {
        switch(e.detail.type) {
            case 'coal_mined':
                gameStats.coalMined += e.detail.amount || 1;
                scheduleSave();
                break;
            case 'trash_mined':
                gameStats.trashMined += e.detail.amount || 1;
                scheduleSave();
                break;
            case 'plasma_mined':
                gameStats.plasmaMined += e.detail.amount || 1;
                scheduleSave();
                break;
            case 'ore_mined':
                gameStats.oreMined = (gameStats.oreMined || 0) + (e.detail.amount || 1);
                scheduleSave();
                break;
            case 'coal_burned':
                gameStats.coalBurned += e.detail.amount || 1;
                scheduleSave();
                break;
            case 'coal_stolen':
                gameStats.coalStolen += e.detail.amount || 1;
                scheduleSave();
                break;
            case 'night_started':
                gameStats.nightsSurvived++;
                scheduleSave();
                break;
            case 'rebel_attack':
                gameStats.rebelAttacks++;
                scheduleSave();
                break;
            case 'attack_defended':
                gameStats.attacksDefended++;
                scheduleSave();
                break;
            case 'day_started':
                onDayStarted();
                break;
        }
    }
});