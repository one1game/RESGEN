// ======== game.js (ИСПРАВЛЕННАЯ ВЕРСИЯ С НОВЫМИ ФИЧАМИ) ========

import init, { start_game, apply_config_from_admin } from './pkg/corebox_rs.js';
import { 
    initStatistics, 
    updateStatisticsDisplay,
    switchTab,
    gameStats,
    saveStatistics,
    loadUserStatistics,
    resetUserStatistics
} from './statistics.js';

import { craftModule } from './craft.js';
import { designModule } from './design.js';
import { fleetModule } from './fleet.js';

let game;
let lastConfigHash = null;
let isAutoClicking = false;
let currentUser = null;
let lastRustStats = null;
let clickCounter = 0;
let powerTracker = 0;

// НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ КОМБО
let comboCount = 0;
let lastClickTime = 0;

// НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ ПРЕСТИЖА
let prestigeLevel = Number(localStorage.getItem('corebox_prestige_level')) || 0;

// НОВАЯ ПЕРЕМЕННАЯ ДЛЯ СЛУЧАЙНЫХ СОБЫТИЙ
let randomEventTimer = 0;

let sounds = {
    click: null,
    error: null,
    upgrade: null
};

const USER_STORAGE_KEY = 'corebox_users';
const CURRENT_USER_KEY = 'corebox_current_user';

// Функция для отображения плавающего текста
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

// НОВАЯ ФУНКЦИЯ: случайные события
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
        logBox.scrollTop = logBox.scrollHeight;
    }
    showFloatingText(event.name, 300, 100);
}

// НОВАЯ ФУНКЦИЯ: престиж
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
    }
}

function getPrestigeBonus() {
    return {
        critBonus: prestigeLevel * 0.01,
        comboBonus: prestigeLevel * 0.05,
        eventBonus: prestigeLevel * 0.005
    };
}

function getUsers() {
    const usersJson = localStorage.getItem(USER_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
}

function saveUsers(users) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
    currentUser = user;
}

function showAuthMessage(message, isError = false) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = message;
    messageEl.className = `auth-message ${isError ? 'error' : 'success'}`;
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loginUser(username, password) {
    const users = getUsers();
    
    if (users[username]) {
        const hashedInput = await hashPassword(password);
        if (users[username].password === hashedInput) {
            users[username].lastLogin = new Date().toISOString();
            saveUsers(users);
            
            setCurrentUser({ username, ...users[username] });
            showAuthMessage(`Добро пожаловать, ${username}!`);
            
            setTimeout(() => {
                document.getElementById('authOverlay').style.display = 'none';
                document.getElementById('gameContent').style.display = 'block';
                showUserInfo();
                initializeGame();
            }, 1000);
            
            return true;
        } else {
            showAuthMessage('Неверный пароль!', true);
            return false;
        }
    } else {
        const hashedPassword = await hashPassword(password);
        users[username] = {
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            statistics: {
                totalClicks: 0,
                maxPowerReached: 0,
                nightsSurvived: 0,
                rebelAttacks: 0,
                attacksDefended: 0,
                coalMined: 0,
                trashMined: 0,
                plasmaMined: 0,
                oreMined: 0,
                coalBurned: 0,
                coalStolen: 0,
                playTime: 0,
                sessionsCount: 1,
                lastSessionDate: new Date().toISOString()
            }
        };
        
        saveUsers(users);
        setCurrentUser({ username, ...users[username] });
        showAuthMessage(`Аккаунт ${username} создан! Добро пожаловать!`);
        
        setTimeout(() => {
            document.getElementById('authOverlay').style.display = 'none';
            document.getElementById('gameContent').style.display = 'block';
            showUserInfo();
            initializeGame();
        }, 1000);
        
        return true;
    }
}

let logoutHandler = null;

function showUserInfo() {
    if (currentUser) {
        document.getElementById('userInfo').style.display = 'block';
        const prestigeTag = prestigeLevel > 0 ? ` ✦${prestigeLevel}` : '';
        document.getElementById('usernameDisplay').textContent = currentUser.username + prestigeTag;
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutHandler) {
            logoutBtn.removeEventListener('click', logoutHandler);
        }
        logoutHandler = logout;
        logoutBtn.addEventListener('click', logoutHandler);
    }
}

function logout() {
    if (currentUser && gameStats) {
        saveCurrentUserStatistics();
    }
    
    setCurrentUser(null);
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('gameContent').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('authMessage').textContent = '';
    document.getElementById('userInfo').style.display = 'none';
    
    setTimeout(() => {
        location.reload();
    }, 500);
}

function initializeCollapsiblePanels() {
    setTimeout(() => {
        const panelTitles = document.querySelectorAll('.panel-title');
        
        panelTitles.forEach(panelTitle => {
            panelTitle.addEventListener('click', (e) => {
                if (e.target.closest('button')) {
                    return;
                }
                
                const panel = panelTitle.closest('.panel');
                panel.classList.toggle('collapsed');
                
                const icon = panelTitle.querySelector('.collapse-icon');
                if (icon) {
                    if (panel.classList.contains('collapsed')) {
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
    document.querySelectorAll('.panel').forEach((panel, index) => {
        const title = panel.querySelector('.panel-title span')?.textContent || `panel-${index}`;
        panelStates[title] = panel.classList.contains('collapsed');
    });
    localStorage.setItem('corebox_panel_states', JSON.stringify(panelStates));
}

function restorePanelStates() {
    try {
        const savedStates = localStorage.getItem('corebox_panel_states');
        if (savedStates) {
            const panelStates = JSON.parse(savedStates);
            
            document.querySelectorAll('.panel').forEach((panel, index) => {
                const title = panel.querySelector('.panel-title span')?.textContent || `panel-${index}`;
                if (panelStates[title]) {
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

function updateVisibility(visibility) {
    const el = document.getElementById('visibilityBar');
    const label = document.getElementById('visibilityLabel');
    if (!el || !label) return;
    
    el.style.width = `${visibility}%`;
    
    el.className = 'visibility-fill';
    if (visibility >= 70) {
        el.classList.add('visibility-critical');
        label.textContent = `⚠️ ЗАМЕТНОСТЬ: ${visibility}%`;
    } else if (visibility >= 40) {
        el.classList.add('visibility-high');
        label.textContent = `👁️ Заметность: ${visibility}%`;
    } else {
        el.classList.add('visibility-low');
        label.textContent = `👁️ Заметность: ${visibility}%`;
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
            
            const visibility = rustStats.visibility || 0;
            updateVisibility(visibility);
        }
    } catch (e) {
        console.warn('Не удалось обновить нейро-статус:', e);
    }
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

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        childList: true,
        subtree: true
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
    
    return baseCrit + evolutionBonus + prestigeBonus;
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
                coal_burned: Math.max(0, rustStats.coal_burned - (lastRustStats.coal_burned || 0)),
                coal_stolen: Math.max(0, rustStats.coal_stolen - (lastRustStats.coal_stolen || 0))
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
            
            if (Math.random() < 0.1) {
                saveCurrentUserStatistics();
            }
            
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
    
    if (now - lastClickTime < 1000) {
        comboCount++;
    } else {
        comboCount = 1;
    }
    lastClickTime = now;
    
    if (comboCount > 1) {
        showFloatingText(`x${comboCount}`, window.innerWidth / 2 + 50, window.innerHeight / 2 - 30);
    }
    
    const statsJson = game.get_statistics();
    let rustStats = null;
    if (statsJson) {
        rustStats = JSON.parse(statsJson);
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
    } else {
        if (game.get_computational_power() > 0) {
            game.start_auto_clicking();
            isAutoClicking = true;
            document.getElementById('floatingMineBtn').classList.add('auto-clicking');
            document.getElementById('autoClickStatus').textContent = 'АКТИВНА';
            document.getElementById('autoClickStatus').classList.add('auto-clicking-status');
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

        floatingMineBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startPressTimer();
        });
        floatingMineBtn.addEventListener('touchend', clearPressTimer);
        floatingMineBtn.addEventListener('touchcancel', clearPressTimer);
    }
}

function switchMainTab(tabName) {
    console.log(`=== ПЕРЕКЛЮЧЕНИЕ НА ВКЛАДКУ: ${tabName} ===`);
    
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
    }
}

function updateCraftTab() {
    console.log('=== ОБНОВЛЕНИЕ ВКЛАДКИ КРАФТ ===');
    if (!game) {
        console.error('game не определен!');
        return;
    }
    
    const craftContainer = document.getElementById('craftContainer');
    if (!craftContainer) {
        console.error('Контейнер craftContainer не найден!');
        return;
    }
    
    try {
        const statsJson = game.get_statistics();
        if (statsJson) {
            const rustStats = JSON.parse(statsJson);
            craftModule.syncFromStats(rustStats);
            craftContainer.innerHTML = craftModule.renderCraftUI();
            craftModule.setupEventListeners(craftContainer);
            console.log('Вкладка Крафт успешно обновлена');
        }
    } catch (e) {
        console.error('Ошибка обновления крафта:', e);
    }
}

function updateDesignTab() {
    console.log('=== ОБНОВЛЕНИЕ ВКЛАДКИ РАЗРАБОТКА ===');
    if (!game) {
        console.error('game не определен!');
        return;
    }
    
    const designContainer = document.getElementById('designContainer');
    if (!designContainer) {
        console.error('Контейнер designContainer не найден!');
        return;
    }
    
    try {
        const power = game.get_computational_power();
        designModule.updateComputationalPower(power);
        designContainer.innerHTML = designModule.renderDesignUI();
        designModule.setupEventListeners(designContainer);
        console.log('Вкладка Разработка успешно обновлена');
    } catch (e) {
        console.error('Ошибка обновления разработки:', e);
    }
}

function updateFleetTab() {
    console.log('=== ОБНОВЛЕНИЕ ВКЛАДКИ ФЛОТ ===');
    
    const fleetContainer = document.getElementById('fleetContainer');
    if (!fleetContainer) {
        console.error('Контейнер fleetContainer не найден!');
        return;
    }
    
    try {
        fleetContainer.innerHTML = fleetModule.renderFleetUI();
        fleetModule.setupEventListeners(fleetContainer);
        console.log('Вкладка Флот успешно обновлена');
    } catch (e) {
        console.error('Ошибка обновления флота:', e);
    }
}

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
                console.log(`Клик по вкладке: ${tab}`);
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
        });
    }
    
    const upgradeDefenseBtn = document.getElementById('upgradeDefenseBtn');
    if (upgradeDefenseBtn) {
        upgradeDefenseBtn.addEventListener('click', () => {
            playSound('upgrade');
            game.activate_defense();
        });
    }
    
    const upgradeDefenseLevelBtn = document.getElementById('upgradeDefenseLevelBtn');
    if (upgradeDefenseLevelBtn) {
        upgradeDefenseLevelBtn.addEventListener('click', () => {
            playSound('upgrade');
            game.upgrade_defense();
        });
    }

    const buyModeBtn = document.getElementById('buyModeBtn');
    if (buyModeBtn) {
        buyModeBtn.addEventListener('click', () => {
            document.getElementById('buyItemsContainer').style.display = 'grid';
            document.getElementById('sellItemsContainer').style.display = 'none';
            document.getElementById('buyModeBtn').classList.add('active');
            document.getElementById('sellModeBtn').classList.remove('active');
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
            switchTab('system');
            playSound('click');
        });
    }

    const statisticsTab = document.getElementById('statistics-tab');
    if (statisticsTab) {
        statisticsTab.addEventListener('click', () => {
            switchTab('statistics');
            updateStatsFromGame();
            updateNeuroStatus();
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
            }
        }
    });
    
    document.addEventListener('designResult', function(e) {
        if (e.detail) {
            showNotification(e.detail.success ? e.detail.message : e.detail.error, e.detail.success ? 'success' : 'error', 2000);
        }
    });
    
    document.addEventListener('fleetAction', function(e) {
        if (e.detail) {
            showNotification(e.detail.success ? e.detail.message : e.detail.error, e.detail.success ? 'success' : 'error', 2000);
        }
    });
}

function loadCurrentUserStatistics() {
    if (!currentUser) return;
    
    const users = getUsers();
    if (users[currentUser.username] && users[currentUser.username].statistics) {
        loadUserStatistics(users[currentUser.username].statistics);
        console.log('📊 Статистика пользователя загружена:', currentUser.username);
    } else {
        console.log('📊 Создана новая статистика для пользователя:', currentUser.username);
        saveCurrentUserStatistics();
    }
}

function saveCurrentUserStatistics() {
    if (!currentUser) return;
    
    const users = getUsers();
    if (users[currentUser.username]) {
        users[currentUser.username].statistics = {
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
        
        saveUsers(users);
    }
}

async function initializeGame() {
    try {
        console.log('=== ИНИЦИАЛИЗАЦИЯ ИГРЫ ===');
        
        await init();
        await loadConfig();

        game = start_game();
        window.game = game;

        loadCurrentUserStatistics();
        
        clickCounter = 0;
        powerTracker = 0;
        
        console.log('Инициализация craftModule...');
        craftModule.init(game);
        
        console.log('Инициализация designModule...');
        designModule.init(game);
        
        console.log('Инициализация fleetModule...');
        fleetModule.init(game);
        
        console.log('Первоначальная загрузка вкладок...');
        
        const craftContainer = document.getElementById('craftContainer');
        if (craftContainer) {
            const statsJson = game.get_statistics();
            if (statsJson) {
                const rustStats = JSON.parse(statsJson);
                craftModule.syncFromStats(rustStats);
                craftContainer.innerHTML = craftModule.renderCraftUI();
                craftModule.setupEventListeners(craftContainer);
            }
        }
        
        const designContainer = document.getElementById('designContainer');
        if (designContainer) {
            const power = game.get_computational_power();
            designModule.updateComputationalPower(power);
            designContainer.innerHTML = designModule.renderDesignUI();
            designModule.setupEventListeners(designContainer);
        }
        
        const fleetContainer = document.getElementById('fleetContainer');
        if (fleetContainer) {
            fleetContainer.innerHTML = fleetModule.renderFleetUI();
            fleetModule.setupEventListeners(fleetContainer);
        }
        
        initializeSounds();
        
        initStatistics();
        
        setupEventListeners();
        initializeCollapsiblePanels();
        updatePowerGlow();
        
        setupLogObserver();

        // ОСНОВНОЙ ИГРОВОЙ ЦИКЛ - ИСПРАВЛЕННЫЙ
        setInterval(() => {
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
                
                // Крафт — синхронизируем ресурсы
                craftModule.syncFromStats(rustStats);
                
                // Обновляем бонусы ИИ
                const evolution = rustStats.neuro_evolution || 0;
                craftModule.aiProductionBonus = Math.min(30, evolution * 3);
                designModule.aiResearchBonus = Math.floor((rustStats.neuro_consciousness || 0) / 10);
                
                // Флот — передаём бонусы в Rust
                const fleetCombat = fleetModule.getFleetDefenseContribution();
                const fleetRecon = fleetModule.getScoutReconBonus();
                const fleetCargo = fleetModule.getCargoMiningBonus();
                
                try {
                    if (typeof game.set_fleet_defense_bonus === 'function' && fleetCombat > 0) {
                        game.set_fleet_defense_bonus(Math.floor(fleetCombat / 50));
                    }
                    if (typeof game.reduce_visibility === 'function' && fleetRecon > 0) {
                        game.reduce_visibility(Math.floor(fleetRecon / 10));
                    }
                    if (typeof game.set_fleet_cargo_bonus === 'function' && fleetCargo > 0) {
                        game.set_fleet_cargo_bonus(fleetCargo);
                    }
                } catch(e) {}
                
                // Режим тревоги для флота
                if (rustStats.current_ai_mode && rustStats.current_ai_mode.includes('Предсказание')) {
                    fleetModule.setAlertMode(true);
                } else {
                    fleetModule.setAlertMode(false);
                }
                
                // Проверяем новые атаки из истории
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
                                logBox.scrollTop = logBox.scrollHeight;
                            }
                        }
                    }
                }
                
                // Обновляем UI модулей только если вкладки открыты
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
            }
            
            // Случайные события
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

function initializeAuth() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('gameContent').style.display = 'block';
        currentUser = user;
        showUserInfo();
        
        setTimeout(() => {
            switchMainTab('inventory');
        }, 100);
        
        initializeGame();
        return;
    }
    
    const authForm = document.getElementById('authForm');
    
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (username.length < 3) {
            showAuthMessage('Логин должен быть не менее 3 символов!', true);
            return;
        }
        
        if (password.length < 4) {
            showAuthMessage('Пароль должен быть не менее 4 символов!', true);
            return;
        }
        
        await loginUser(username, password);
    });
    
    document.getElementById('registerBtn').addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (username.length < 3) {
            showAuthMessage('Логин должен быть не менее 3 символов!', true);
            return;
        }
        
        if (password.length < 4) {
            showAuthMessage('Пароль должен быть не менее 4 символов!', true);
            return;
        }
        
        const users = getUsers();
        if (users[username]) {
            showAuthMessage('Пользователь с таким логином уже существует!', true);
            return;
        }
        
        await loginUser(username, password);
    });
    
    initializeCollapsiblePanels();
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (isAutoClicking && game) {
            game.stop_auto_clicking();
            isAutoClicking = false;
            const btn = document.getElementById('floatingMineBtn');
            if (btn) btn.classList.remove('auto-clicking');
        }
        Object.values(sounds).forEach(s => { if (s) { s.pause(); s.currentTime = 0; } });
    }
});

document.addEventListener('gameEvent', function(e) {
    if (e.detail && currentUser) {
        switch(e.detail.type) {
            case 'coal_mined':
                gameStats.coalMined += e.detail.amount || 1;
                saveCurrentUserStatistics();
                break;
            case 'trash_mined':
                gameStats.trashMined += e.detail.amount || 1;
                saveCurrentUserStatistics();
                break;
            case 'plasma_mined':
                gameStats.plasmaMined += e.detail.amount || 1;
                saveCurrentUserStatistics();
                break;
            case 'ore_mined':
                gameStats.oreMined = (gameStats.oreMined || 0) + (e.detail.amount || 1);
                saveCurrentUserStatistics();
                break;
            case 'coal_burned':
                gameStats.coalBurned += e.detail.amount || 1;
                saveCurrentUserStatistics();
                break;
            case 'coal_stolen':
                gameStats.coalStolen += e.detail.amount || 1;
                saveCurrentUserStatistics();
                break;
            case 'night_started':
                gameStats.nightsSurvived++;
                saveCurrentUserStatistics();
                break;
            case 'rebel_attack':
                gameStats.rebelAttacks++;
                saveCurrentUserStatistics();
                break;
            case 'attack_defended':
                gameStats.attacksDefended++;
                saveCurrentUserStatistics();
                break;
        }
    }
});

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

window.addEventListener('beforeunload', function() {
    if (currentUser && gameStats) {
        saveCurrentUserStatistics();
    }
});

setInterval(() => {
    if (currentUser && gameStats) {
        saveCurrentUserStatistics();
    }
}, 30000);