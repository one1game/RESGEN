// ============================================================
// ФАЙЛ: proect/statistics.js
// ПРОБЛЕМА: отображается только 12 полей из 30+ доступных
// ============================================================
// Заменить ВЕСЬ файл statistics.js на содержимое ниже:
// ============================================================

export let gameStats = {
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
    startTime: Date.now(),
    sessionsCount: 1,
    lastSessionDate: new Date().toISOString(),
    // НОВЫЕ ПОЛЯ из Rust-статистики:
    oreStolenTotal: 0,
    totalMined: 0,
    rebelActivity: 0,
    visibility: 0,
    neuroEvolution: 0,
    neuroConsciousness: 0,
    neuroScore: 0,
    fleetShips: 0,
    fleetCombatPower: 0,
    blueprintsUnlocked: 0,
    miningLevel: 0,
    defenseLevel: 0,
    defenseActive: false,
    computationalPower: 0,
    currentAiMode: 'Обычный',
    consecutiveDefenses: 0,
    longestDefenseStreak: 0,
    prestige: 0,
};

export function initStatistics() {
    setupStatisticsEventListeners();
    startPlayTimeTracker();
    console.log('📊 Модуль статистики инициализирован');
}

export function loadUserStatistics(userStats) {
    if (!userStats) return;
    try {
        Object.keys(gameStats).forEach(key => {
            if (key in userStats) gameStats[key] = userStats[key];
        });
        gameStats.sessionsCount = (userStats.sessionsCount || 0) + 1;
        gameStats.lastSessionDate = new Date().toISOString();
        gameStats.startTime = Date.now() - ((userStats.playTime || 0) * 1000);
        updateStatisticsDisplay();
    } catch (e) {
        console.error('Ошибка загрузки статистики:', e);
    }
}

export function saveStatistics() {
    updatePlayTime();
}

export function resetUserStatistics() {
    if (confirm('Сбросить всю статистику? Это нельзя отменить.')) {
        const preserved = { sessionsCount: gameStats.sessionsCount };
        Object.keys(gameStats).forEach(k => {
            if (typeof gameStats[k] === 'number') gameStats[k] = 0;
            else if (typeof gameStats[k] === 'boolean') gameStats[k] = false;
            else if (typeof gameStats[k] === 'string') gameStats[k] = '';
        });
        gameStats.sessionsCount = preserved.sessionsCount;
        gameStats.startTime = Date.now();
        gameStats.lastSessionDate = new Date().toISOString();
        gameStats.currentAiMode = 'Обычный';
        updateStatisticsDisplay();
        return true;
    }
    return false;
}

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ — синхронизирует ВСЁ из Rust
// Вызывается из game.js в основном цикле
// ============================================================
export function updateStatisticsFromRust(rustStats) {
    if (!rustStats) return;
    
    // Добыча (cumulative diff чтобы не затирать сессионное накопление)
    gameStats.totalMined       = rustStats.total_mined || 0;
    gameStats.coalMined        = rustStats.coal_mined  || rustStats.total_coal_mined  || gameStats.coalMined;
    gameStats.trashMined       = rustStats.trash_mined || rustStats.total_trash_mined || gameStats.trashMined;
    gameStats.plasmaMined      = rustStats.plasma_mined|| rustStats.total_plasma_mined|| gameStats.plasmaMined;
    gameStats.oreMined         = rustStats.ore_mined   || rustStats.total_ore_mined   || gameStats.oreMined;
    gameStats.coalBurned       = rustStats.coal_burned || rustStats.total_coal_burned || gameStats.coalBurned;
    gameStats.coalStolen       = rustStats.coal_stolen || rustStats.total_coal_stolen || gameStats.coalStolen;
    gameStats.oreStolenTotal   = rustStats.total_ore_stolen  || 0;
    
    // Ночи и бои
    gameStats.nightsSurvived   = rustStats.nights_survived   || gameStats.nightsSurvived;
    gameStats.rebelAttacks     = rustStats.rebel_attacks     || rustStats.rebel_attacks_count || gameStats.rebelAttacks;
    gameStats.attacksDefended  = rustStats.attacks_defended  || gameStats.attacksDefended;
    
    // Система и ИИ
    gameStats.rebelActivity    = rustStats.rebel_activity    || 0;
    gameStats.visibility       = rustStats.visibility        || 0;
    gameStats.computationalPower = rustStats.computational_power || 0;
    gameStats.currentAiMode    = rustStats.current_ai_mode   || 'Обычный';
    
    // Нейро
    gameStats.neuroEvolution   = rustStats.neuro_evolution   || 0;
    gameStats.neuroConsciousness = rustStats.neuro_consciousness || 0;
    gameStats.neuroScore       = rustStats.neuro_score       || 0;
    
    // Апгрейды
    gameStats.miningLevel      = (rustStats.upgrades && rustStats.upgrades.mining) || 0;
    gameStats.defenseLevel     = (rustStats.upgrades && rustStats.upgrades.defense_level) || 0;
    gameStats.defenseActive    = (rustStats.upgrades && rustStats.upgrades.defense) || false;
    
    // Серии
    gameStats.consecutiveDefenses  = rustStats.consecutive_successful_defenses || 0;
    gameStats.longestDefenseStreak = rustStats.longest_defense_streak || 0;
    
    // Чертежи
    const bp = [rustStats.blueprint_cargo_unlocked, rustStats.blueprint_scout_unlocked, rustStats.blueprint_combat_unlocked];
    gameStats.blueprintsUnlocked = bp.filter(Boolean).length;
    
    updateStatisticsDisplay();
}

export function updateStatisticsDisplay() {
    try {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        // Основное
        set('totalClicks',       (gameStats.totalClicks || 0).toLocaleString());
        set('maxPowerReached',   gameStats.maxPowerReached || 0);
        set('nightsSurvived',    gameStats.nightsSurvived || 0);
        set('totalMined',        (gameStats.totalMined || 0).toLocaleString());

        // Безопасность
        set('rebelAttacks',      gameStats.rebelAttacks || 0);
        set('attacksDefended',   gameStats.attacksDefended || 0);
        set('rebelActivity',     gameStats.rebelActivity || 0);
        set('visibility',        (gameStats.visibility || 0) + '%');
        set('consecutiveDefenses',  gameStats.consecutiveDefenses || 0);
        set('longestDefenseStreak', gameStats.longestDefenseStreak || 0);

        // Ресурсы
        set('coalMined',   (gameStats.coalMined || 0).toLocaleString());
        set('trashMined',  (gameStats.trashMined || 0).toLocaleString());
        set('plasmaMined', (gameStats.plasmaMined || 0).toLocaleString());
        set('oreMined',    (gameStats.oreMined || 0).toLocaleString());

        // Потери
        set('coalBurned',      (gameStats.coalBurned || 0).toLocaleString());
        set('coalStolen',      (gameStats.coalStolen || 0).toLocaleString());
        set('oreStolenTotal',  (gameStats.oreStolenTotal || 0).toLocaleString());
        set('playTime',        formatTime(gameStats.playTime || 0));

        // Система
        set('computationalPower', gameStats.computationalPower || 0);
        set('currentAiMode',      gameStats.currentAiMode || 'Обычный');
        set('miningLevel',        gameStats.miningLevel || 0);
        set('defenseLevel',       gameStats.defenseLevel || 0);
        set('defenseActive',      gameStats.defenseActive ? '✅ Активна' : '❌ Неактивна');
        set('blueprintsUnlocked', (gameStats.blueprintsUnlocked || 0) + '/3');

        // Нейро
        set('neuroEvolution',    gameStats.neuroEvolution || 0);
        set('neuroConsciousness', ((gameStats.neuroConsciousness || 0) * 100).toFixed(1) + '%');
        set('neuroScore',        gameStats.neuroScore || 0);

        // Флот (из fleetModule если доступен)
        try {
            const fm = window.fleetModule;
            if (fm) {
                set('fleetShips',       fm.ships.length + '/' + fm.maxFleetSize);
                set('fleetCombatPower', fm.getTotalCombatPower());
            }
        } catch(e) {}

        // Сессия
        set('sessionsCount',     gameStats.sessionsCount || 1);
        set('lastSessionDate',   gameStats.lastSessionDate ? new Date(gameStats.lastSessionDate).toLocaleString('ru') : '—');
        set('prestige',          gameStats.prestige || 0);

    } catch (e) {
        console.error('Ошибка обновления статистики:', e);
    }
}

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0 сек';
    if (seconds < 60) return `${Math.floor(seconds)} сек`;
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
        return `${m} мин ${s} сек`;
    }
    if (seconds < 86400) {
        const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
        return `${h} ч ${m} мин`;
    }
    const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600);
    return `${d} дн ${h} ч`;
}

let playTimeInterval;
function startPlayTimeTracker() {
    if (playTimeInterval) clearInterval(playTimeInterval);
    playTimeInterval = setInterval(() => { gameStats.playTime += 1; }, 1000);
}

function setupStatisticsEventListeners() {
    const refreshBtn = document.getElementById('refreshStatsBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => updateStatisticsDisplay());

    const resetBtn = document.getElementById('resetStatsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const ok = resetUserStatistics();
            if (ok) document.dispatchEvent(new CustomEvent('resetUserStats', { detail: { stats: gameStats } }));
        });
    }
}

export function switchTab(tabName) {
    const systemSection    = document.getElementById('system-status-section');
    const statisticsSection = document.getElementById('statistics-section');
    const systemTab        = document.getElementById('system-status-tab');
    const statisticsTab    = document.getElementById('statistics-tab');
    if (!systemSection || !statisticsSection) return;

    if (tabName === 'system') {
        systemSection.style.display = 'block';
        statisticsSection.style.display = 'none';
        systemTab?.classList.add('active');
        statisticsTab?.classList.remove('active');
    } else {
        systemSection.style.display = 'none';
        statisticsSection.style.display = 'block';
        systemTab?.classList.remove('active');
        statisticsTab?.classList.add('active');
        updateStatisticsDisplay();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatistics);
} else {
    setTimeout(initStatistics, 100);
}