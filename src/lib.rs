mod game;
mod systems;
mod web;

use wasm_bindgen::prelude::*;
use crate::game::config::GameConfig;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use serde_json;
use crate::game::GameEvent;


// Глобальная переменная для хранения конфига
static CONFIG: Lazy<Mutex<GameConfig>> = Lazy::new(|| {
    Mutex::new(GameConfig::default())
});

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    log("CoreBox 3.0 запущен");
}

#[wasm_bindgen]
pub struct CoreGame {
    state: game::state::GameState,
    mining_system: systems::mining::MiningSystem,
    economy_system: systems::economy::EconomySystem,
    upgrade_system: systems::upgrades::UpgradeSystem,
    rebel_system: systems::rebel::RebelSystem,
    ui: web::GameUI,
}

#[wasm_bindgen]
pub fn apply_config_from_admin(config_json: String) -> String {
    console_error_panic_hook::set_once();
    
    match serde_json::from_str::<GameConfig>(&config_json) {
        Ok(config) => {
            if let Some(window) = web_sys::window() {
                if let Ok(Some(storage)) = window.local_storage() {
                    let json = serde_json::to_string(&config).unwrap_or_default();
                    let _ = storage.set_item("corebox_config", &json);
                }
            }
            
            *CONFIG.lock().unwrap() = config;
            "✅ Конфиг применен и сохранен".to_string()
        }
        Err(e) => format!("❌ Ошибка парсинга конфига: {}", e),
    }
}

#[wasm_bindgen]
pub fn validate_config(config_json: String) -> String {
    match serde_json::from_str::<GameConfig>(&config_json) {
        Ok(_) => "✅ Конфиг валиден".to_string(),
        Err(e) => format!("❌ Ошибка валидации конфига: {}", e),
    }
}

impl CoreGame {
    fn load_config_from_storage() -> GameConfig {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                if let Ok(Some(config_json)) = storage.get_item("corebox_config") {
                    web_sys::console::log_1(&"📁 Config loaded from localStorage".into());
                    match serde_json::from_str::<GameConfig>(&config_json) {
                        Ok(config) => return config,
                        Err(e) => {
                            web_sys::console::log_1(&format!("❌ Failed to parse config from localStorage: {}", e).into());
                        }
                    }
                }
            }
        }
        
        web_sys::console::log_1(&"❌ No config found, using default".into());
        GameConfig::default()
    }
}

#[wasm_bindgen]
impl CoreGame {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        
        // Загружаем конфиг ПЕРВЫМ делом
        let config = Self::load_config_from_storage();
        
        // ОТЛАДОЧНЫЙ ВЫВОД ДЛЯ ПРОВЕРКИ КОНФИГА
        web_sys::console::log_1(&format!("🎯 Config max_power: {}", config.auto_click_config.max_computational_power).into());
        
        // Создаем состояние с правильными значениями из конфига
        let state = game::state::GameState::new(&config);
        
        // ОТЛАДОЧНЫЙ ВЫВОД ДЛЯ ПРОВЕРКИ СОСТОЯНИЯ
        web_sys::console::log_1(&format!("🎮 State max_power: {}", state.max_computational_power).into());
        
        let game = Self {
            state,
            mining_system: systems::mining::MiningSystem::new(config.mining_config.clone()),
            economy_system: systems::economy::EconomySystem::new(config.economy_config.clone()),
            upgrade_system: systems::upgrades::UpgradeSystem::new(config.upgrade_config.clone()),
            rebel_system: systems::rebel::RebelSystem::new(),
            ui: web::GameUI::new(),
        };
        
        // Обновляем глобальный конфиг ПОСЛЕ создания всех систем
        *CONFIG.lock().unwrap() = config;
        
        game
    }
    
    #[wasm_bindgen]
    pub fn init(&mut self) {
        self.load();
        let _ = self.ui.render(&self.state);
    }
    
    #[wasm_bindgen]
    pub fn mine_resources(&mut self) {
        let events = self.mine_resources_internal();
        self.handle_events(events);
    }
    
    // НОВЫЕ МЕТОДЫ ДЛЯ СИСТЕМЫ КЛИКОВ
    #[wasm_bindgen]
    pub fn add_manual_click(&mut self) {
        let events = self.add_manual_click_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn start_auto_clicking(&mut self) {
        let events = self.start_auto_clicking_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn stop_auto_clicking(&mut self) {
        let events = self.stop_auto_clicking_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn get_computational_power(&self) -> u32 {
        self.state.computational_power
    }
    
    #[wasm_bindgen]
    pub fn is_auto_clicking(&self) -> bool {
        self.state.auto_clicking
    }
    
    #[wasm_bindgen]
    pub fn toggle_coal(&mut self) {
        let events = self.toggle_coal_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn upgrade_mining(&mut self) {
        let events = self.upgrade_mining_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn activate_defense(&mut self) {
        let events = self.activate_defense_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn upgrade_defense(&mut self) {
        let events = self.upgrade_defense_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn buy_resource(&mut self, resource: String) {
        let events = self.buy_resource_internal(&resource);
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn sell_resource(&mut self, resource: String) {
        let events = self.sell_resource_internal(&resource);
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn switch_tab(&mut self, tab: String) {
        let _ = self.ui.switch_tab(&tab);
    }
    
    #[wasm_bindgen]
    pub fn reload_config(&mut self) {
        let config = Self::load_config_from_storage();
        self.update_config(config);
        
        web_sys::console::log_1(&"🔄 Конфиг перезагружен".into());
    }

    #[wasm_bindgen]
    pub fn debug_time_info(&self) -> String {
        let config_guard = CONFIG.lock().unwrap();
        format!(
            "Текущее время: {}, День: {}, Длит. дня: {}, Длит. ночи: {}",
            self.state.game_time,
            self.state.is_day,
            config_guard.time_config.day_duration,
            config_guard.time_config.night_duration
        )
    }
    
    #[wasm_bindgen]
    pub fn debug_rebel_info(&self) -> String {
        format!(
            "Активность повстанцев: {}/10, Ночь: {}, Защита: {}",
            self.state.rebel_activity,
            !self.state.is_day,
            self.state.upgrades.defense
        )
    }
    
    #[wasm_bindgen]
    pub fn debug_power_info(&self) -> String {
        format!(
            "Мощность: {}/{}, Автоклики: {}, Ручные клики: {}/{}",
            self.state.computational_power,
            self.state.max_computational_power,
            self.state.auto_clicking,
            self.state.manual_clicks,
            { 
                let config_guard = CONFIG.lock().unwrap();
                config_guard.auto_click_config.clicks_per_power
            }
        )
    }
    
    #[wasm_bindgen]
    pub fn clear_log(&self) {
        self.ui.clear_log();
    }
    
    fn handle_events(&mut self, events: Vec<GameEvent>) {
        for event in events {
            let _ = self.ui.handle_event(&event);
        }
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn game_loop(&mut self) {
        let events = self.game_loop_internal();
        self.handle_events(events);
    }
    
    fn load(&mut self) {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                if let Ok(Some(saved_state)) = storage.get_item("corebox_save") {
                    match serde_json::from_str::<game::state::GameState>(&saved_state) {
                        Ok(mut state) => {
                            let config_guard = CONFIG.lock().unwrap();
                            
                            // ВАЖНО: Сохраняем правильное значение max_computational_power из конфига
                            state.max_computational_power = config_guard.auto_click_config.max_computational_power;
                            
                            // Исправляем некорректное время
                            if state.game_time <= 0 {
                                state.game_time = if state.is_day {
                                    config_guard.time_config.day_duration
                                } else {
                                    config_guard.time_config.night_duration
                                };
                                web_sys::console::log_1(&format!("🔄 Исправлено время: {} сек", state.game_time).into());
                            }
                            
                            web_sys::console::log_1(&format!("🔄 Load: max_power updated to {}", state.max_computational_power).into());
                            self.state = state;
                        }
                        Err(e) => {
                            web_sys::console::log_1(&format!("❌ Ошибка загрузки состояния: {}", e).into());
                            // Создаем новое состояние при ошибке загрузки
                            let config_guard = CONFIG.lock().unwrap();
                            self.state = game::state::GameState::new(&config_guard);
                        }
                    }
                }
            }
        }
    }
    
    fn save(&self) {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                match serde_json::to_string(&self.state) {
                    Ok(state_json) => {
                        let _ = storage.set_item("corebox_save", &state_json);
                    }
                    Err(e) => {
                        web_sys::console::log_1(&format!("❌ Ошибка сохранения состояния: {}", e).into());
                    }
                }
            }
        }
    }
    
    fn update_config(&mut self, new_config: GameConfig) {
        // Обновляем системы с новым конфигом
        self.mining_system = systems::mining::MiningSystem::new(new_config.mining_config.clone());
        self.economy_system = systems::economy::EconomySystem::new(new_config.economy_config.clone());
        self.upgrade_system = systems::upgrades::UpgradeSystem::new(new_config.upgrade_config.clone());
        self.rebel_system = systems::rebel::RebelSystem::new();
        
        // ОБНОВЛЯЕМ максимальную мощность из нового конфига
        self.state.max_computational_power = new_config.auto_click_config.max_computational_power;
        
        // Сохраняем прогресс квестов
        let old_quests = std::mem::take(&mut self.state.quests);
        self.state.load_quests(&new_config);
        
        // Восстанавливаем прогресс выполненных квестов
        for old_quest in old_quests {
            if let Some(new_quest) = self.state.quests.iter_mut().find(|q| q.id == old_quest.id) {
                new_quest.completed = old_quest.completed;
            }
        }
        
        // Обновляем глобальный конфиг
        *CONFIG.lock().unwrap() = new_config;
        
        // Обновляем интерфейс
        let _ = self.ui.render(&self.state);
        
        web_sys::console::log_1(&"✅ Конфиг обновлен".into());
    }
    
    fn mine_resources_internal(&mut self) -> Vec<GameEvent> {
        if !self.state.is_ai_active() {
            return vec![GameEvent::LogMessage("❌ Система неактивна! Включите ТЭЦ или дождитесь дня".to_string())];
        }
        
        self.mining_system.mine_resources(&mut self.state)
    }
    
    // НОВЫЕ ВНУТРЕННИЕ МЕТОДЫ ДЛЯ СИСТЕМЫ КЛИКОВ
    fn add_manual_click_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        // ПРОВЕРЯЕМ АКТИВНОСТЬ СИСТЕМЫ
        if !self.state.is_ai_active() {
            events.push(GameEvent::LogMessage("❌ Система неактивна! Включите ТЭЦ или дождитесь дня".to_string()));
            return events;
        }
        
        // Увеличиваем счетчик ручных кликов
        self.state.manual_clicks += 1;
        
        // Получаем настройки из конфига
        let config_guard = crate::CONFIG.lock().unwrap();
        let clicks_per_power = config_guard.auto_click_config.clicks_per_power;
        
        // Проверяем, заполнился ли прогресс синхронизации
        if self.state.manual_clicks >= clicks_per_power {
            let power_to_add = 1; // Мощность за полный прогресс
            
            // Сбрасываем счетчик и добавляем мощность
            self.state.manual_clicks = 0;
            self.state.computational_power = (self.state.computational_power + power_to_add)
                .min(self.state.max_computational_power);
            
            events.push(GameEvent::ComputationalPowerAdded { 
                amount: power_to_add, 
                total: self.state.computational_power 
            });
        }
        
        // Производим обычную добычу
        let mining_events = self.mine_resources_internal();
        events.extend(mining_events);
        
        events
    }
    
    fn start_auto_clicking_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if !self.state.auto_clicking && self.state.computational_power > 0 {
            self.state.auto_clicking = true;
            self.state.last_auto_click_time = 0;
            events.push(GameEvent::AutoClickingStarted);
            events.push(GameEvent::LogMessage("🤖 Автоклики активированы!".to_string()));
        } else if self.state.computational_power == 0 {
            events.push(GameEvent::LogMessage("❌ Недостаточно мощности для автокликов".to_string()));
        }
        
        events
    }
    
    fn stop_auto_clicking_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if self.state.auto_clicking {
            self.state.auto_clicking = false;
            events.push(GameEvent::AutoClickingStopped);
            events.push(GameEvent::LogMessage("⏹️ Автоклики остановлены".to_string()));
        }
        
        events
    }
    
    fn toggle_coal_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if self.state.coal_enabled {
            self.state.coal_enabled = false;
            events.push(GameEvent::CoalDeactivated);
            events.push(GameEvent::LogMessage("ТЭЦ отключена".to_string()));
        } else {
            if self.state.inventory.coal >= 1 {
                self.state.coal_enabled = true;
                self.state.inventory.coal -= 1;
                events.push(GameEvent::CoalActivated);
                events.push(GameEvent::LogMessage("ТЭЦ активирована (-1 уголь)".to_string()));
            } else {
                events.push(GameEvent::LogMessage("Нет угля для активации ТЭЦ".to_string()));
            }
        }
        events
    }
    
    fn upgrade_mining_internal(&mut self) -> Vec<GameEvent> {
        self.upgrade_system.upgrade_mining(&mut self.state)
    }
    
    fn activate_defense_internal(&mut self) -> Vec<GameEvent> {
        self.upgrade_system.activate_defense(&mut self.state)
    }
    
    fn upgrade_defense_internal(&mut self) -> Vec<GameEvent> {
        self.upgrade_system.upgrade_defense(&mut self.state)
    }
    
    fn buy_resource_internal(&mut self, resource: &str) -> Vec<GameEvent> {
        self.economy_system.buy_resource(&mut self.state, resource)
    }
    
    fn sell_resource_internal(&mut self, resource: &str) -> Vec<GameEvent> {
        self.economy_system.sell_resource(&mut self.state, resource)
    }
    
    fn game_loop_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        // ПОЛУЧАЕМ КОНФИГ ОДИН РАЗ в начале
        let config_guard = CONFIG.lock().unwrap();
        
        let time_events = self.state.update_time(1, &config_guard);
        events.extend(time_events);
        
        // ОБНОВЛЕНИЕ ПОВСТАНЦЕВ
        events.extend(self.rebel_system.update_rebel_activity(&mut self.state, &config_guard));
        
        // ПРОВЕРКА АТАК ПОВСТАНЦЕВ
        events.extend(self.rebel_system.check_rebel_attack(&mut self.state, &config_guard));
        
        // ПАССИВНАЯ ДОБЫЧА
        events.extend(self.mining_system.passive_mining(&mut self.state));
        
        // АВТОКЛИКИ
        if self.state.auto_clicking {
            self.state.last_auto_click_time += 1;
            
            let auto_click_interval = config_guard.auto_click_config.auto_click_interval;
            
            if self.state.last_auto_click_time >= auto_click_interval {
                let power_per_auto_click = config_guard.auto_click_config.power_per_auto_click;
                
                if self.state.computational_power >= power_per_auto_click {
                    self.state.computational_power -= power_per_auto_click;
                    self.state.last_auto_click_time = 0;
                    
                    // ИСПОЛЬЗУЕМ auto_mine_resources для автокликов
                    let mining_events = self.mining_system.auto_mine_resources(&mut self.state);
                    events.extend(mining_events);
                    
                    events.push(GameEvent::LogMessage(
                        format!("⚡ Автоклик: -{} мощности (интервал: {}сек)", power_per_auto_click, auto_click_interval)
                    ));
                } else {
                    self.state.auto_clicking = false;
                    events.push(GameEvent::ComputationalPowerDepleted);
                    events.push(GameEvent::LogMessage(
                        "❌ Недостаточно мощности! Автоклики отключены".to_string()
                    ));
                }
            }
        }
        
        // ПРОВЕРКА КВЕСТОВ
        if self.state.current_quest < self.state.quests.len() {
            let current_quest_index = self.state.current_quest; // Сохраняем индекс
            let quest_completed = {
                let quest = &self.state.quests[current_quest_index];
                !quest.completed && quest.check_completion(&self.state)
            };
            
            if quest_completed {
                let quest = &mut self.state.quests[current_quest_index];
                self.state.tng += quest.reward;
                events.push(GameEvent::QuestCompleted {
                    title: quest.title.clone(),
                    reward: quest.reward,
                });
                
                // НОВАЯ ЛОГИКА РАЗБЛОКИРОВКИ ИЗ КОНФИГА
                for unlock in &quest.unlocks {
                    match unlock.as_str() {
                        "chips" if !self.state.chips_unlocked => {
                            self.state.chips_unlocked = true;
                            events.push(GameEvent::LogMessage("🔓 Разблокирована добыча чипов!".to_string()));
                        }
                        "plasma" if !self.state.plasma_unlocked => {
                            self.state.plasma_unlocked = true;
                            events.push(GameEvent::LogMessage("🔓 Разблокирована добыча плазмы!".to_string()));
                        }
                        "coal_trade" => {
                            // можно добавить разблокировку торговли углем
                            events.push(GameEvent::LogMessage("🔓 Разблокирована торговля углем!".to_string()));
                        }
                        _ => {}
                    }
                }
                
                quest.completed = true;
                self.state.current_quest += 1;
            }
        }
        
        events // ← возвращаем события (ДОБАВИТЬ ЭТУ СТРОКУ)
    } // ← закрывающая скобка метода (ДОБАВИТЬ ЭТУ СКОБКУ)

}

#[wasm_bindgen]
pub fn start_game() -> CoreGame {
    console_error_panic_hook::set_once();
    let mut game = CoreGame::new();
    game.init();
    game
}

#[wasm_bindgen]
pub fn get_config() -> String {
    let config_guard = CONFIG.lock().unwrap();
    match serde_json::to_string(&*config_guard) {
        Ok(json) => json,
        Err(e) => format!("❌ Ошибка сериализации конфига: {}", e)
    }
}