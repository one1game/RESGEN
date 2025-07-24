const inventory = {};
const maxSlots = 9;
const resourceCooldowns = { 'Уголь': 3000 };
const lastMined = {};

const leftPanelItems = ['ТЭЦ', '', '', '', ''];
const rightPanelItems = ['', '', '', '', ''];

let gameTime = 60;
let isDay = true;
let messageTimeout;

function showMessage(text) {
  const box = document.getElementById('messageBox');
  box.innerText = text;
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    box.innerText = '';
  }, 2000);
}

function updateTimeDisplay() {
  document.getElementById('timeDisplay').innerText = `⏰ ${isDay ? 'День' : 'Ночь'} — ${gameTime}с осталось`;
}

function render() {
  const invDiv = document.getElementById('inventory');
  const leftDiv = document.getElementById('leftSlots');
  const rightDiv = document.getElementById('rightSlots');

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

    if (resourceCooldowns[name]) {
      const remaining = Math.max(0, resourceCooldowns[name] - (now - (lastMined[name] || 0)));
      if (remaining > 0) {
        const cd = document.createElement('div');
        cd.className = 'cooldown';
        cd.innerText = `⏳ ${Math.ceil(remaining / 1000)}с`;
        slot.appendChild(cd);
      }
    }

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

  updateTimeDisplay();
  addDragListeners();
}

function mine() {
  const now = Date.now();
  if (!isDay && !inventory['Уголь']) {
    showMessage('🌙 Ночь. Без угля добыча невозможна.');
    return;
  }

  const cooldown = resourceCooldowns['Уголь'];
  const last = lastMined['Уголь'] || 0;
  if (now - last < cooldown) {
    const wait = Math.ceil((cooldown - (now - last)) / 1000);
    showMessage(`⏳ Уголь готов через ${wait}с`);
    return;
  }

  inventory['Уголь'] = (inventory['Уголь'] || 0) + 1;
  lastMined['Уголь'] = now;
  showMessage('✅ Уголь добыт');
  render();
}

function craft() {
  showMessage('🔧 Крафт временно отключён.');
}

function addDragListeners() {
  const slots = document.querySelectorAll('.slot');
  let dragSrc = null;

  slots.forEach((slot) => {
    slot.addEventListener('dragstart', (e) => {
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

inventory['ИИ'] = 1;

document.getElementById('mineBtn').addEventListener('click', mine);
document.getElementById('craftBtn').addEventListener('click', craft);

setInterval(() => {
  gameTime--;
  if (gameTime <= 0) {
    gameTime = 60;
    isDay = !isDay;
  }
  render();
}, 1000);

render();
