// ======== game-state.js ========
const inventory = { 
    'ИИ': 1,
    'Уголь': 0,
    'Мусор': 0,
    'Чипы': 0,
    'Плазма': 0
};

const upgrades = {
    mining: 0,
    defense: false,
    defenseLevel: 0
};

let tng = 0;
let coalEnabled = false;
let gameTime = GameConfig.CYCLE_DURATION / 2;
let isDay = true;
let passiveCounter = 0;
let trashSold = 0;
let criticalMining = false;
let autoScrollEnabled = true;
let rebelActivity = 0;
let lastUpdateTime = Date.now();
let nightsSurvived = 0;
let successfulDefenses = 0;
let coalProduced = 0;
let totalMined = 0;
let aiDisabledUntil = 0;
let nightsWithCoal = 0;
let currentQuestIndex = 0;

let questProgress = {
    totalMined: 0,
    nightsWithCoal: 0,
    successfulDefenses: 0,
    resourcesMined: {}
};

// ИСПРАВЛЕНО: только уголь и мусор разблокированы изначально
let coalUnlocked = true;
let trashUnlocked = true;
let chipsUnlocked = false;  // было true
let plasmaUnlocked = false; // было true

const collapsedState = {
    statusPanel: false,
    logPanel: false,
    inventoryPanel: false,
    upgradesPanel: false,
    tradePanel: false,
    questsPanel: false
};

// ДОБАВЛЕНО: состояние радио и голосовых настроек
let radioState = {
    playing: false,
    volume: 0.5
};

let voiceSettings = {
    enabled: true,
    volume: 0.8,
    rate: 1.0
};

// ДОБАВЛЕНО: сохранение журнала
let logEntries = [];

// ДОБАВЛЕНО: состояние вкладок
let activeTab = 'inventory';

function autoUnlockResources() {
    // Уголь и мусор всегда разблокированы
    coalUnlocked = true;
    trashUnlocked = true;
    
    // Чипы и плазма разблокируются только через задания
    if (currentQuestIndex >= 2) { // после задания chips_discovery
        chipsUnlocked = true;
    }
    if (currentQuestIndex >= 3) { // после задания plasma_breakthrough
        plasmaUnlocked = true;
    }
}

function sanitizeInventory() {
    const defaultInventory = {
        'Уголь': 0,
        'Мусор': 0,
        'Чипы': 0,
        'Плазма': 0,
        'ИИ': 1
    };
    
    Object.keys(defaultInventory).forEach(key => {
        if (inventory[key] === undefined) {
            inventory[key] = defaultInventory[key];
        }
        inventory[key] = Number(inventory[key]) || defaultInventory[key];
    });
    
    autoUnlockResources();
}