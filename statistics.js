// statistics.js - Модуль статистики с поддержкой пользователей

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
};

export function initStatistics() {
    setupStatisticsEventListeners();
    startPlayTimeTracker();
    console.log('📊 Модуль статистики инициализирован');
}

export function loadUserStatistics(userStats) {
    if (!userStats) return;
    
    try {
        gameStats.totalClicks = userStats.totalClicks || 0;
        gameStats.maxPowerReached = userStats.maxPowerReached || 0;
        gameStats.nightsSurvived = userStats.nightsSurvived || 0;
        gameStats.rebelAttacks = userStats.rebelAttacks || 0;
        gameStats.attacksDefended = userStats.attacksDefended || 0;
        gameStats.coalMined = userStats.coalMined || 0;
        gameStats.trashMined = userStats.trashMined || 0;
        gameStats.plasmaMined = userStats.plasmaMined || 0;
        gameStats.oreMined = userStats.oreMined || 0;
        gameStats.coalBurned = userStats.coalBurned || 0;
        gameStats.coalStolen = userStats.coalStolen || 0;
        gameStats.playTime = userStats.playTime || 0;
        gameStats.sessionsCount = (userStats.sessionsCount || 0) + 1;
        gameStats.lastSessionDate = new Date().toISOString();
        
        gameStats.startTime = Date.now() - ((userStats.playTime || 0) * 1000);
        
        console.log('📊 Статистика пользователя загружена');
        
        updateStatisticsDisplay();
        
    } catch (e) {
        console.error('Ошибка загрузки статистики пользователя:', e);
    }
}

export function saveStatistics() {
    updatePlayTime();
    console.log('📊 Статистика обновлена в памяти');
}

export function resetUserStatistics() {
    if (confirm('Вы уверены, что хотите сбросить статистику? Это действие нельзя отменить.')) {
        gameStats = {
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
        };
        
        console.log('📊 Статистика пользователя сброшена');
        updateStatisticsDisplay();
        
        return true;
    }
    return false;
}

export function updateStatisticsDisplay() {
    try {
        const elements = {
            'totalClicks': gameStats.totalClicks.toLocaleString(),
            'maxPowerReached': gameStats.maxPowerReached,
            'nightsSurvived': gameStats.nightsSurvived,
            'rebelAttacks': gameStats.rebelAttacks,
            'attacksDefended': gameStats.attacksDefended,
            'coalMined': gameStats.coalMined.toLocaleString(),
            'trashMined': gameStats.trashMined.toLocaleString(),
            'plasmaMined': gameStats.plasmaMined,
            'oreMined': gameStats.oreMined.toLocaleString(),
            'coalBurned': gameStats.coalBurned.toLocaleString(),
            'coalStolen': gameStats.coalStolen.toLocaleString(),
            'playTime': formatTime(gameStats.playTime),
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
        
    } catch (e) {
        console.error('Ошибка обновления отображения статистики:', e);
    }
}

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0 сек';
    if (seconds < 60) return `${Math.floor(seconds)} сек`;
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes} мин ${secs} сек`;
    }
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} час ${minutes} мин`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days} дней ${hours} час`;
}

let playTimeInterval;

function startPlayTimeTracker() {
    if (playTimeInterval) {
        clearInterval(playTimeInterval);
    }
    
    playTimeInterval = setInterval(() => {
        updatePlayTime();
    }, 1000);
}

function updatePlayTime() {
    gameStats.playTime += 1;
}

function setupStatisticsEventListeners() {
    const refreshBtn = document.getElementById('refreshStatsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            updateStatisticsDisplay();
            console.log('📊 Статистика обновлена вручную');
        });
    }

    const resetBtn = document.getElementById('resetStatsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const shouldUpdateProfile = resetUserStatistics();
            if (shouldUpdateProfile) {
                const event = new CustomEvent('resetUserStats', { detail: { stats: gameStats } });
                document.dispatchEvent(event);
            }
        });
    }
}

export function switchTab(tabName) {
    const systemSection = document.getElementById('system-status-section');
    const statisticsSection = document.getElementById('statistics-section');
    const systemTab = document.getElementById('system-status-tab');
    const statisticsTab = document.getElementById('statistics-tab');

    if (!systemSection || !statisticsSection || !systemTab || !statisticsTab) {
        return;
    }

    if (tabName === 'system') {
        systemSection.style.display = 'block';
        statisticsSection.style.display = 'none';
        systemTab.classList.add('active');
        statisticsTab.classList.remove('active');
    } else if (tabName === 'statistics') {
        systemSection.style.display = 'none';
        statisticsSection.style.display = 'block';
        systemTab.classList.remove('active');
        statisticsTab.classList.add('active');
        updateStatisticsDisplay();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatistics);
} else {
    setTimeout(initStatistics, 100);
}