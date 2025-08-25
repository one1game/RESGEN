// Состояние игры
const inventory = { 
  'ИИ': 1 
  // Остальные ресурсы появятся после их разблокировки
};

const upgrades = {
  mining: 0,
  defense: false,
  defenseLevel: 0
};

let tng = 0;
let coalEnabled = false;
let gameTime = CYCLE_DURATION / 2;
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

// Флаги разблокировки ресурсов
let coalUnlocked = false;
let trashUnlocked = false; 
let chipsUnlocked = false;
let plasmaUnlocked = false;

// Состояние свернутых панелей
const collapsedState = {
  statusPanel: false,
  logPanel: false,
  inventoryPanel: false,
  upgradesPanel: false,
  tradePanel: false,
  questsPanel: false
};