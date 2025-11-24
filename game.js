import init, { start_game, apply_config_from_admin } from './pkg/corebox_rs.js';

let game;
let lastConfigHash = null;
let autoClickInterval;
let isAutoClicking = false;
let currentUser = null;

// Система хранения пользователей
const USER_STORAGE_KEY = 'corebox_users';
const CURRENT_USER_KEY = 'corebox_current_user';

// Функции для работы с пользователями
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

// Функции авторизации
function showAuthMessage(message, isError = false) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = message;
    messageEl.className = `auth-message ${isError ? 'error' : 'success'}`;
}

function loginUser(username, password) {
    const users = getUsers();
    
    if (users[username]) {
        // Проверяем пароль существующего пользователя
        if (users[username].password === password) {
            // Обновляем время последнего входа
            users[username].lastLogin = new Date().toISOString();
            saveUsers(users);
            
            setCurrentUser({ username, ...users[username] });
            showAuthMessage(`Добро пожаловать, ${username}!`);
            
            // Показываем игру через секунду
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
        // Создаем нового пользователя
        users[username] = {
            password: password,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        saveUsers(users);
        setCurrentUser({ username, ...users[username] });
        showAuthMessage(`Аккаунт ${username} создан! Добро пожаловать!`);
        
        // Показываем игру через секунду
        setTimeout(() => {
            document.getElementById('authOverlay').style.display = 'none';
            document.getElementById('gameContent').style.display = 'block';
            showUserInfo();
            initializeGame();
        }, 1000);
        
        return true;
    }
}

function showUserInfo() {
    if (currentUser) {
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('usernameDisplay').textContent = currentUser.username;
        
        document.getElementById('logoutBtn').addEventListener('click', logout);
    }
}

function logout() {
    setCurrentUser(null);
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('gameContent').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('authMessage').textContent = '';
    document.getElementById('userInfo').style.display = 'none';
    
    // Перезагружаем страницу для сброса состояния игры
    setTimeout(() => {
        location.reload();
    }, 500);
}

// Инициализация авторизации
function initializeAuth() {
    // Проверяем, есть ли активный пользователь
    const user = getCurrentUser();
    if (user) {
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('gameContent').style.display = 'block';
        currentUser = user;
        showUserInfo();
        initializeGame();
        return;
    }
    
    // Настраиваем обработчики формы
    const authForm = document.getElementById('authForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    authForm.addEventListener('submit', (e) => {
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
        
        loginUser(username, password);
    });
    
    registerBtn.addEventListener('click', () => {
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
        
        loginUser(username, password);
    });
}

// Функция для хэширования конфига (чтобы определить изменения)
function hashConfig(configStr) {
    let hash = 0, i, chr;
    if (configStr.length === 0) return hash;
    for (i = 0; i < configStr.length; i++) {
        chr   = configStr.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Приведение к 32-битному числу
    }
    return hash;
}

// Очистка журнала
document.getElementById('clearLogBtn').addEventListener('click', () => {
    if (game && typeof game.clear_log === 'function') {
        game.clear_log();
    }
});

// Функция загрузки конфига и применения только при изменении
async function loadConfig() {
    try {
        const resp = await fetch("config.json?_" + Date.now());
        const configStr = await resp.text();
        const currentHash = hashConfig(configStr);

        if (currentHash !== lastConfigHash) {
            lastConfigHash = currentHash;
            
            try {
                // Пробуем применить конфиг
                const result = apply_config_from_admin(configStr);
                console.log("✅ Конфиг применен:", result);
            } catch (e) {
                // Если ошибка - очищаем localStorage
                console.error("❌ Ошибка применения конфига, очищаю кэш:", e);
                localStorage.removeItem('corebox_config');
                location.reload();
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

// Функции для системы кликов
function toggleAutoClicking() {
    if (isAutoClicking) {
        // Выключаем автоклики
        game.stop_auto_clicking();
        isAutoClicking = false;
        document.getElementById('mineBtn').classList.remove('auto-clicking');
        document.getElementById('floatingMineBtn').classList.remove('auto-clicking');
    } else {
        // Включаем автоклики если есть мощность
        if (game.get_computational_power() > 0) {
            game.start_auto_clicking();
            isAutoClicking = true;
            document.getElementById('mineBtn').classList.add('auto-clicking');
            document.getElementById('floatingMineBtn').classList.add('auto-clicking');
        }
    }
}

function handleClick() {
    // Всегда делаем ручной клик при нажатии
    game.add_manual_click();
}

// Обработчики долгого нажатия
function setupLongPressHandlers() {
    const mineBtn = document.getElementById('mineBtn');
    const floatingMineBtn = document.getElementById('floatingMineBtn');
    let pressTimer;

    function startPressTimer(element) {
        pressTimer = setTimeout(() => {
            toggleAutoClicking();
        }, 500); // 500ms для долгого нажатия
    }

    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    // Мышиные события для основной кнопки
    mineBtn.addEventListener('mousedown', () => startPressTimer(mineBtn));
    mineBtn.addEventListener('mouseup', clearPressTimer);
    mineBtn.addEventListener('mouseleave', clearPressTimer);

    // Мышиные события для плавающей кнопки
    floatingMineBtn.addEventListener('mousedown', () => startPressTimer(floatingMineBtn));
    floatingMineBtn.addEventListener('mouseup', clearPressTimer);
    floatingMineBtn.addEventListener('mouseleave', clearPressTimer);

    // Touch события для основной кнопки
    mineBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startPressTimer(mineBtn);
    });
    mineBtn.addEventListener('touchend', clearPressTimer);
    mineBtn.addEventListener('touchcancel', clearPressTimer);

    // Touch события для плавающей кнопки
    floatingMineBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startPressTimer(floatingMineBtn);
    });
    floatingMineBtn.addEventListener('touchend', clearPressTimer);
    floatingMineBtn.addEventListener('touchcancel', clearPressTimer);
}

// Обработчики интерфейса
function setupEventListeners() {
    // Обычные клики - только добыча
    document.getElementById('mineBtn').addEventListener('click', handleClick);
    document.getElementById('floatingMineBtn').addEventListener('click', handleClick);

    // Обработчики долгого нажатия
    setupLongPressHandlers();

    // Общие обработчики действий
    document.addEventListener('click', (event) => {
        if (!game) return;
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const resource = target.getAttribute('data-resource');

        if (action === 'buy' && resource) game.buy_resource(resource);
        else if (action === 'sell' && resource) game.sell_resource(resource);
        else if (action === 'toggle-coal') game.toggle_coal();
    });

    // Апгрейды
    document.getElementById('upgradeMiningBtn').addEventListener('click', () => game.upgrade_mining());
    document.getElementById('upgradeDefenseBtn').addEventListener('click', () => game.activate_defense());
    document.getElementById('upgradeDefenseLevelBtn').addEventListener('click', () => game.upgrade_defense());

    // Торговля
    document.getElementById('buyModeBtn').addEventListener('click', () => {
        document.getElementById('buyItemsContainer').style.display = 'grid';
        document.getElementById('sellItemsContainer').style.display = 'none';
        document.getElementById('buyModeBtn').classList.add('active');
        document.getElementById('sellModeBtn').classList.remove('active');
    });
    document.getElementById('sellModeBtn').addEventListener('click', () => {
        document.getElementById('buyItemsContainer').style.display = 'none';
        document.getElementById('sellItemsContainer').style.display = 'grid';
        document.getElementById('buyModeBtn').classList.remove('active');
        document.getElementById('sellModeBtn').classList.add('active');
    });

    // Журнал
    document.getElementById('clearLogBtn').addEventListener('click', () => {
        document.getElementById('logBox').innerHTML = '';
    });
    document.getElementById('autoScrollBtn').addEventListener('click', () => {
        const logBox = document.getElementById('logBox');
        logBox.scrollTop = logBox.scrollHeight;
    });

    // Вкладки
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => game.switch_tab(tab.dataset.tab));
    });
}

// Основная функция запуска игры
async function initializeGame() {
    try {
        // 1️⃣ Загружаем WASM
        await init();

        // 2️⃣ Загружаем конфиг перед стартом игры
        await loadConfig();

        // 3️⃣ Запускаем игру
        game = start_game();
        window.game = game; // для дебага в консоли

        // 4️⃣ Ставим обработчики интерфейса
        setupEventListeners();

        // 5️⃣ Игровой цикл
        setInterval(() => game.game_loop(), 1000);

        // 6️⃣ Проверка обновления конфига каждые 10 секунд
        setInterval(loadConfig, 10000);

        console.log("🎮 Игра успешно запущена!");
    } catch (error) {
        console.error("❌ Ошибка при запуске игры:", error);
    }
}

// Запускаем систему авторизации когда страница загружена
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}