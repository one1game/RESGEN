const inventory = { 'ИИ': 1 };
const maxSlots = 9;
const resourceCooldowns = { 'Уголь': 3000 };
const lastMined = {};

const leftPanelItems = ['ТЭЦ', '', '', '', ''];
const rightPanelItems = ['', '', '', '', ''];

let gameTime = 60;
let isDay = true;

function updateTimeDisplay() {
  document.getElementById('timeDisplay').innerText =
    `⏰ ${isDay ? 'День' : 'Ночь'} — ${gameTime}с осталось`;
}

function render() {
  const invDiv = document.getElementById('inventory');
  const leftDiv = document.getElementById('leftSlots');
  const rightDiv = document.getElementById('rightSlots');
  const aiSlot = document.getElementById('aiSlot');

  invDiv.innerHTML = '';
  leftDiv.innerHTML = '';
  rightDiv.innerHTML = '';

  const now = Date.now();
  const keys = Object.keys(inventory);
  let renderedSlots = 0;

  keys.forEach((name) => {
    if (name === 'ИИ') return;
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.draggable = true;
    slot.dataset.resource = name;
    slot.innerHTML = `${name} x${inventory[name]}`;
    invDiv.appendChild(slot);
    renderedSlots++;
  });

  for (let i = renderedSlots; i < maxSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = '[пусто]';
    invDiv.appendChild(slot);
  }

  leftPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    leftDiv.appendChild(slot);
  });

  rightPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    rightDiv.appendChild(slot);
  });

  aiSlot.innerText = (inventory['ИИ'] && (!isDay && inventory['Уголь'] > 0 || isDay)) 
    ? '🤖 ИИ активен' 
    : '🛑 ИИ неактивен';

  updateTimeDisplay();
  addDragListeners();
}

function mine() {
  const now = Date.now();
  const coalCount = inventory['Уголь'] || 0;

  const chance = coalCount > 0 ? 0.5 : 0.15;
  if (Math.random() < chance) {
    inventory['Уголь'] = coalCount + 1;
  }
  lastMined['Уголь'] = now;
  render();
}

function craft() {
  alert('Крафт временно отключён.');
}

function addDragListeners() {
  const slots = document.querySelectorAll('.slot');
  let dragSrc = null;

  slots.forEach((slot) => {
    slot.addEventListener('dragstart', () => {
      dragSrc = slot.dataset.resource;
      slot.classList.add('dragging');
    });

    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
    });

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    slot.addEventListener('drop', () => {
      const dropRes = slot.dataset.resource;
      if (!dragSrc || !dropRes || dragSrc === dropRes) return;
      const tmp = inventory[dragSrc];
      inventory[dragSrc] = inventory[dropRes];
      inventory[dropRes] = tmp;
      render();
    });
  });
}

document.getElementById('mineBtn').addEventListener('click', mine);
document.getElementById('craftBtn').addEventListener('click', craft);

setInterval(() => {
  gameTime--;
  if (gameTime <= 0) {
    gameTime = 60;
    isDay = !isDay;

    if (inventory['Уголь'] && inventory['Уголь'] > 0) {
      inventory['Уголь'] -= 1;
    }
  }
  render();
}, 1000);

render();


