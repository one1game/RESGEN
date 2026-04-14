// ======== src/lib.rs (ПОЛНАЯ ВЕРСИЯ С SUPABASE ИНТЕГРАЦИЕЙ) ========

#![recursion_limit = "256"]

mod game;
mod systems;
mod web;

use wasm_bindgen::prelude::*;
use crate::game::GameEvent;
use crate::game::state::GameState;
use crate::game::config::GameConfig;
use crate::systems::mining::MiningSystem;
use crate::systems::economy::EconomySystem;
use crate::systems::upgrades::UpgradeSystem;
use crate::systems::rebel::RebelSystem;
use crate::systems::neuro_ecosystem::NeuroEcosystem;
use crate::web::GameUI;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use serde_json;

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
    state: GameState,
    mining_system: MiningSystem,
    economy_system: EconomySystem,
    upgrade_system: UpgradeSystem,
    rebel_system: RebelSystem,
    neuro_ecosystem: NeuroEcosystem,
    ui: GameUI,
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

impl CoreGame {
    fn load_config_from_storage() -> GameConfig {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                if let Ok(Some(config_json)) = storage.get_item("corebox_config") {
                    match serde_json::from_str::<GameConfig>(&config_json) {
                        Ok(config) => return config,
                        Err(_) => {}
                    }
                }
            }
        }
        
        GameConfig::default()
    }
}

#[wasm_bindgen]
impl CoreGame {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        
        let config = Self::load_config_from_storage();
        let state = GameState::new(&config);
        
        let neuro_ecosystem = NeuroEcosystem::new();
        let rebel_system = RebelSystem::new();
        
        Self {
            state,
            mining_system: MiningSystem::new(config.mining_config.clone()),
            economy_system: EconomySystem::new(config.economy_config.clone()),
            upgrade_system: UpgradeSystem::new(config.upgrade_config.clone()),
            rebel_system,
            neuro_ecosystem,
            ui: GameUI::new(),
        }
    }

    #[wasm_bindgen]
    pub fn save_game(&self) {
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn init(&mut self) {
        self.load();
        let _ = self.ui.render(&self.state);
    }
    
    // ========== НОВЫЙ МЕТОД: ЗАГРУЗКА СОСТОЯНИЯ ИЗ ОБЛАКА ==========
    #[wasm_bindgen]
    pub fn load_game_state(&mut self, state_json: String) -> Result<(), JsValue> {
        match serde_json::from_str::<GameState>(&state_json) {
            Ok(loaded_state) => {
                // Сохраняем важные параметры, которые не должны перезаписываться
                let old_max_power = self.state.max_computational_power;
                let old_prestige = self.state.prestige_level;
                let old_neuro = self.neuro_ecosystem.clone();
                let old_rebel = self.rebel_system.clone();
                
                // Загружаем новое состояние
                self.state = loaded_state;
                
                // Восстанавливаем важные параметры
                self.state.max_computational_power = old_max_power;
                self.state.prestige_level = old_prestige;
                
                // Восстанавливаем нейро-систему из загруженного состояния
                self.neuro_ecosystem.load_from_state(
                    self.state.neuro_evolution,
                    self.state.neuro_consciousness,
                    self.state.neuro_score
                );
                
                // Обновляем бонусы
                self.state.neuro_defense_bonus = self.neuro_ecosystem.get_defense_bonus();
                self.state.neuro_prediction_bonus = self.neuro_ecosystem.get_prediction_bonus();
                
                // Обновляем отображение
                let _ = self.ui.render(&self.state);
                self.ui.add_log_entry("💾 Состояние игры загружено из облака");
                
                log(&format!("✅ Загружено состояние: ночей={}, угля={}", 
                    self.state.nights_survived, 
                    self.state.inventory.coal));
                
                Ok(())
            },
            Err(e) => {
                let err_msg = format!("❌ Ошибка загрузки состояния: {}", e);
                self.ui.add_log_entry(&err_msg);
                log(&err_msg);
                Err(JsValue::from_str(&err_msg))
            }
        }
    }
    
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
    pub fn get_max_computational_power(&self) -> u32 {
        self.state.max_computational_power
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
    pub fn upgrade_crit_module(&mut self) {
        let events = self.upgrade_system.upgrade_crit_module(&mut self.state);
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn upgrade_cooling_module(&mut self) {
        let events = self.upgrade_system.upgrade_cooling_module(&mut self.state);
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
    pub fn buy_rebel_protection(&mut self) {
        let events = self.buy_rebel_protection_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn toggle_rebel_protection(&mut self) {
        let events = self.toggle_rebel_protection_internal();
        self.handle_events(events);
    }
    
    #[wasm_bindgen]
    pub fn switch_tab(&mut self, tab: String) {
        if let Err(e) = self.ui.switch_tab(&tab) {
            web_sys::console::error_1(&format!("❌ Ошибка переключения вкладки: {:?}", e).into());
        }
    }
    
    #[wasm_bindgen]
    pub fn reload_config(&mut self) {
        let config = Self::load_config_from_storage();
        self.update_config(config);
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
            "Активность повстанцев: {}/15, Ночь: {}, Защита: Ур.{}, Откуп: {} ночей (активен: {})",
            self.state.rebel_activity,
            !self.state.is_day,
            self.state.upgrades.defense_level,
            self.state.rebel_protection_nights,
            self.state.rebel_protection_active
        )
    }
    
    #[wasm_bindgen]
    pub fn debug_power_info(&self) -> String {
        let config_guard = CONFIG.lock().unwrap();
        format!(
            "Мощность: {}/{}, Автоклики: {}, Ручные клики: {}/{}",
            self.state.computational_power,
            self.state.max_computational_power,
            self.state.auto_clicking,
            self.state.manual_clicks,
            config_guard.auto_click_config.clicks_per_power
        )
    }

    #[wasm_bindgen]
    pub fn debug_neuro_ecosystem_info(&self) -> String {
        self.neuro_ecosystem.get_debug_info()
    }
    
    #[wasm_bindgen]
    pub fn debug_neuro_status(&self) -> String {
        self.neuro_ecosystem.get_status()
    }
    
    #[wasm_bindgen]
    pub fn debug_rebel_status(&self) -> String {
        self.rebel_system.get_debug_info()
    }
    
    #[wasm_bindgen]
    pub fn clear_log(&self) {
        self.ui.clear_log();
    }

    #[wasm_bindgen]
    pub fn get_statistics(&self) -> String {
        let blueprints = format!(
            r#"{{"cargo":{},"scout":{},"combat":{}}}"#,
            self.state.blueprint_cargo_unlocked,
            self.state.blueprint_scout_unlocked,
            self.state.blueprint_combat_unlocked
        );
        
        let attack_history = serde_json::to_string(&self.state.attack_history).unwrap_or_else(|_| "[]".to_string());
        let rebel_factions = serde_json::to_string(&self.rebel_system.get_faction_info()).unwrap_or_else(|_| "[]".to_string());
        
        format!(
            r#"{{"total_clicks":{},
                "max_power_reached":{},
                "nights_survived":{},
                "rebel_attacks":{},
                "attacks_defended":{},
                "coal_mined":{},
                "trash_mined":{},
                "plasma_mined":{},
                "ore_mined":{},
                "ore_inventory":{},
                "chips_inventory":{},
                "plasma_inventory":{},
                "coal_inventory":{},
                "trash_inventory":{},
                "neuro_evolution":{},
                "neuro_consciousness":{},
                "neuro_score":{},
                "neuro_memory":{},
                "neuro_next_score":{},
                "neuro_next_memory":{},
                "rebel_evolution":{},
                "rebel_adaptation":{},
                "defense_bonus":{},
                "prediction_bonus":{},
                "current_ai_mode":"{}",
                "attack_warning":"{}",
                "attack_warning_faction":"{}",
                "last_attacking_faction":"{}",
                "mining_debuff_remaining":{},
                "autoclick_debuff_remaining":{},
                "defense_debuff_remaining":{},
                "rebel_factions":{},
                "attack_history":{},
                "is_day":{},
                "coal_enabled":{},
                "game_time":{},
                "blueprints_unlocked":{},
                "blueprint_research_progress":{},
                "turbine_heat":{},
                "turbine_upgrade_level":{},
                "turbine_cooling":{},
                "coal_burned":{},
                "coal_stolen":{},
                "crit_level":{},
                "cooling_level":{},
                "power_tier":{},
                "prestige_level":{}
            }}"#,
            self.state.manual_clicks,
            self.state.max_computational_power,
            self.state.nights_survived,
            self.state.rebel_attacks_count,
            self.state.attacks_defended,
            self.state.total_coal_mined,
            self.state.total_trash_mined,
            self.state.total_plasma_mined,
            self.state.total_ore_mined,
            self.state.inventory.ore,
            self.state.inventory.chips,
            self.state.inventory.plasma,
            self.state.inventory.coal,
            self.state.inventory.trash,
            self.neuro_ecosystem.evolution_level,
            (self.neuro_ecosystem.system_consciousness * 100.0).round(),
            self.neuro_ecosystem.get_evolution_score(),
            self.neuro_ecosystem.threat_memory_len(),
            self.neuro_ecosystem.get_next_level_requirements().0,
            self.neuro_ecosystem.get_next_level_requirements().1,
            self.rebel_system.evolution_level,
            self.rebel_system.adaptation_level,
            self.state.neuro_defense_bonus,
            self.state.neuro_prediction_bonus,
            self.state.current_ai_mode,
            self.state.attack_warning,
            self.state.attack_warning_faction,
            self.state.last_attacking_faction,
            self.state.mining_debuff_remaining,
            self.state.autoclick_debuff_remaining,
            self.state.defense_debuff_remaining,
            rebel_factions,
            attack_history,
            self.state.is_day,
            self.state.coal_enabled,
            self.state.game_time,
            blueprints,
            self.state.blueprint_research_progress,
            self.state.turbine_heat,
            self.state.turbine_upgrade_level,
            self.state.turbine_cooling,
            self.state.total_coal_burned,
            self.state.total_coal_stolen,
            self.state.upgrades.crit_level,
            self.state.upgrades.cooling_level,
            self.state.power_tier,
            self.state.prestige_level
        )
    }
    
    // ========== МЕТОДЫ КРАФТА ==========
    
    #[wasm_bindgen]
    pub fn craft_chips_from_ore(&mut self) -> String {
        if self.state.inventory.ore >= 100 {
            self.state.inventory.ore -= 100;
            self.state.inventory.chips += 1;
            
            self.ui.add_log_entry("⚙️ Крафт: создан 1 чип из 100 руды!");
            
            self.save();
            let _ = self.ui.render(&self.state);
            
            "success".to_string()
        } else {
            "error".to_string()
        }
    }
    
    #[wasm_bindgen]
    pub fn craft_plasma_from_coal(&mut self) -> String {
        if self.state.inventory.coal >= 50 {
            self.state.inventory.coal -= 50;
            self.state.inventory.plasma += 1;
            self.state.total_plasma_mined += 1;
            
            self.ui.add_log_entry("⚡ Крафт: создана плазма из 50 угля!");
            
            self.save();
            let _ = self.ui.render(&self.state);
            
            "success".to_string()
        } else {
            "error".to_string()
        }
    }
    
    // ========== МЕТОДЫ КОРАБЛЕСТРОЕНИЯ ==========
    
    #[wasm_bindgen]
    pub fn design_ship(&mut self, ship_type: String) -> String {
        let design_cost = match ship_type.as_str() {
            "cargo" => 500,
            "scout" => 10,
            "combat" => 800,
            _ => return "error".to_string(),
        };
        
        if self.state.computational_power >= design_cost {
            self.state.computational_power -= design_cost;
            self.ui.add_log_entry(&format!("📐 Создан чертеж {} корабля!", ship_type));
            self.save();
            "success".to_string()
        } else {
            "error".to_string()
        }
    }
    
    #[wasm_bindgen]
    pub fn craft_cargo_ship(&mut self) -> String {
        self.craft_ship_internal("cargo")
    }
    
    #[wasm_bindgen]
    pub fn craft_scout_ship(&mut self) -> String {
        self.craft_ship_internal("scout")
    }
    
    #[wasm_bindgen]
    pub fn craft_combat_ship(&mut self) -> String {
        self.craft_ship_internal("combat")
    }
    
    fn craft_ship_internal(&mut self, ship_type: &str) -> String {
        let (ore_cost, chips_cost, plasma_cost) = match ship_type {
            "cargo" => (200, 50, 10),
            "scout" => (100, 100, 20),
            "combat" => (300, 150, 30),
            _ => return "error".to_string(),
        };
        
        if self.state.inventory.ore >= ore_cost &&
           self.state.inventory.chips >= chips_cost &&
           self.state.inventory.plasma >= plasma_cost {
            
            self.state.inventory.ore -= ore_cost;
            self.state.inventory.chips -= chips_cost;
            self.state.inventory.plasma -= plasma_cost;
            
            self.ui.add_log_entry(&format!("🚀 Создан {} корабль!", ship_type));
            self.save();
            
            "success".to_string()
        } else {
            "error".to_string()
        }
    }
    
    // ========== МЕТОДЫ ДЛЯ ЧЕРТЕЖЕЙ ==========
    
    #[wasm_bindgen]
    pub fn get_blueprint_status(&self) -> String {
        format!(
            r#"{{"blueprints_unlocked":{{"cargo":{},"scout":{},"combat":{}}},"ai_research_bonus":{}}}"#,
            self.state.blueprint_cargo_unlocked,
            self.state.blueprint_scout_unlocked,
            self.state.blueprint_combat_unlocked,
            (self.neuro_ecosystem.system_consciousness * 0.5) as u32
        )
    }
    
    #[wasm_bindgen]
    pub fn sync_blueprints(&mut self, cargo: bool, scout: bool, combat: bool) {
        self.state.blueprint_cargo_unlocked = cargo;
        self.state.blueprint_scout_unlocked = scout;
        self.state.blueprint_combat_unlocked = combat;
        self.save();
    }
    
    // ========== МЕТОДЫ ДЛЯ ФЛОТА ==========
    
    #[wasm_bindgen]
    pub fn apply_fleet_repair(&mut self, ore_cost: u32, chips_cost: u32) -> bool {
        if self.state.inventory.ore >= ore_cost && self.state.inventory.chips >= chips_cost {
            self.state.inventory.ore -= ore_cost;
            self.state.inventory.chips -= chips_cost;
            self.ui.add_log_entry(&format!(
                "🔧 Флот отремонтирован (-{} руды, -{} чипов)", ore_cost, chips_cost
            ));
            let _ = self.ui.render(&self.state);
            self.save();
            true
        } else {
            false
        }
    }
    
    #[wasm_bindgen]
    pub fn apply_fleet_upgrade(&mut self, ore_cost: u32, chips_cost: u32, plasma_cost: u32) -> bool {
        if self.state.inventory.ore >= ore_cost 
        && self.state.inventory.chips >= chips_cost
        && self.state.inventory.plasma >= plasma_cost {
            self.state.inventory.ore -= ore_cost;
            self.state.inventory.chips -= chips_cost;
            self.state.inventory.plasma -= plasma_cost;
            self.ui.add_log_entry(&format!(
                "⬆️ Корабль улучшен (-{} руды, -{} чипов, -{} плазмы)", 
                ore_cost, chips_cost, plasma_cost
            ));
            let _ = self.ui.render(&self.state);
            self.save();
            true
        } else {
            false
        }
    }
    
    #[wasm_bindgen]
    pub fn set_fleet_defense_bonus(&mut self, bonus: u32) {
        self.state.temporary_defense_bonus = bonus;
    }
    
    #[wasm_bindgen]
    pub fn set_fleet_cargo_bonus(&mut self, bonus: u32) {
        self.state.temporary_mining_bonus = self.state.temporary_mining_bonus.max(bonus);
    }
    
    // ========== МЕТОДЫ ДЛЯ ТУРБИНЫ ==========
    
    #[wasm_bindgen]
    pub fn upgrade_turbine(&mut self) -> bool {
        let cost_ore = 30u32 + self.state.turbine_upgrade_level * 20;
        let cost_chips = 5u32 + self.state.turbine_upgrade_level * 3;
        let max_level = 5u32;
        
        if self.state.turbine_upgrade_level >= max_level {
            self.ui.add_log_entry("⚙️ Турбина уже на максимальном уровне!");
            return false;
        }
        
        if self.state.inventory.ore >= cost_ore && self.state.inventory.chips >= cost_chips {
            self.state.inventory.ore -= cost_ore;
            self.state.inventory.chips -= cost_chips;
            self.state.turbine_upgrade_level += 1;
            self.ui.add_log_entry(&format!(
                "⚙️ Турбина улучшена до уровня {}! Нагрев снижен, остывание быстрее.",
                self.state.turbine_upgrade_level
            ));
            let _ = self.ui.render(&self.state);
            self.save();
            true
        } else {
            self.ui.add_log_entry(&format!(
                "❌ Нужно {} руды и {} чипов для улучшения турбины",
                cost_ore, cost_chips
            ));
            false
        }
    }
    
    #[wasm_bindgen]
    pub fn get_turbine_heat(&self) -> u32 {
        self.state.turbine_heat
    }
    
    #[wasm_bindgen]
    pub fn get_turbine_upgrade_level(&self) -> u32 {
        self.state.turbine_upgrade_level
    }
    
    #[wasm_bindgen]
    pub fn is_turbine_cooling(&self) -> bool {
        self.state.turbine_cooling
    }
    
    // ========== МЕТОДЫ ДЛЯ JS ФИЧ ==========
    
    #[wasm_bindgen]
    pub fn add_resource(&mut self, resource: String, amount: u32) {
        match resource.as_str() {
            "coal" => {
                self.state.inventory.coal += amount;
                self.state.total_coal_mined += amount;
                self.state.total_mined += amount;
            }
            "ore" => {
                self.state.inventory.ore += amount;
                self.state.total_ore_mined += amount;
                self.state.total_mined += amount;
            }
            "chips" => {
                self.state.inventory.chips += amount;
                self.state.total_mined += amount;
            }
            "plasma" => {
                self.state.inventory.plasma += amount;
                self.state.total_plasma_mined += amount;
                self.state.total_mined += amount;
            }
            "trash" => {
                self.state.inventory.trash += amount;
                self.state.total_trash_mined += amount;
                self.state.total_mined += amount;
            }
            _ => {}
        }
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn subtract_resource(&mut self, resource: String, amount: u32) {
        match resource.as_str() {
            "coal" => {
                self.state.inventory.coal = self.state.inventory.coal.saturating_sub(amount);
            }
            "ore" => {
                self.state.inventory.ore = self.state.inventory.ore.saturating_sub(amount);
            }
            "chips" => {
                self.state.inventory.chips = self.state.inventory.chips.saturating_sub(amount);
            }
            "plasma" => {
                self.state.inventory.plasma = self.state.inventory.plasma.saturating_sub(amount);
            }
            "trash" => {
                self.state.inventory.trash = self.state.inventory.trash.saturating_sub(amount);
            }
            _ => {}
        }
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn add_power(&mut self, amount: u32) {
        self.state.computational_power = (self.state.computational_power + amount)
            .min(self.state.max_computational_power);
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn subtract_power(&mut self, amount: u32) {
        self.state.computational_power = self.state.computational_power.saturating_sub(amount);
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn repair_systems(&mut self) {
        self.state.mining_debuff_remaining = 0;
        self.state.mining_debuff_percent = 0.0;
        self.state.autoclick_debuff_remaining = 0;
        self.state.autoclick_debuff_percent = 0.0;
        self.state.defense_debuff_remaining = 0;
        
        if self.state.upgrades.defense {
            self.state.upgrades.defense_level = self.state.upgrades.defense_level.max(1);
        }
        
        self.ui.add_log_entry("🔧 Все системы восстановлены!");
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn reset_progress(&mut self) {
        let config = Self::load_config_from_storage();
        
        let mut new_state = GameState::new(&config);
        
        // Сохраняем чертежи и престиж
        new_state.blueprint_cargo_unlocked = self.state.blueprint_cargo_unlocked;
        new_state.blueprint_scout_unlocked = self.state.blueprint_scout_unlocked;
        new_state.blueprint_combat_unlocked = self.state.blueprint_combat_unlocked;
        new_state.prestige_level = self.state.prestige_level;
        
        self.state = new_state;
        
        self.neuro_ecosystem = NeuroEcosystem::new();
        self.rebel_system = RebelSystem::new();
        
        self.ui.add_log_entry("🔄 Прогресс сброшен!");
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn get_neuro_evolution(&self) -> u32 {
        self.neuro_ecosystem.evolution_level
    }
    
    #[wasm_bindgen]
    pub fn get_resource(&self, resource: String) -> u32 {
        match resource.as_str() {
            "coal" => self.state.inventory.coal,
            "ore" => self.state.inventory.ore,
            "chips" => self.state.inventory.chips,
            "plasma" => self.state.inventory.plasma,
            "trash" => self.state.inventory.trash,
            _ => 0,
        }
    }
    
    // ========== ДЕБАГ-МЕТОДЫ ==========
    
    #[wasm_bindgen]
    pub fn debug_add_neuro_points(&mut self, points: u32) {
        self.neuro_ecosystem.evolution_score += points;
        self.ui.add_log_entry(&format!("🧠 Добавлено {} очков эволюции (отладка)", points));
        self.save();
    }
    
    #[wasm_bindgen]
    pub fn debug_trigger_rebel_attack(&mut self) {
        let config_guard = CONFIG.lock().unwrap();
        let attack_events = self.rebel_system.check_rebel_attack(&mut self.state, &config_guard);
        self.handle_events(attack_events);
    }
    
    // ========== ИГРОВОЙ ЦИКЛ ==========
    
    #[wasm_bindgen]
    pub fn game_loop(&mut self) {
        let events = self.game_loop_internal();
        self.handle_events(events);
    }

    #[wasm_bindgen]
    pub fn get_neuro_status(&self) -> String {
        self.neuro_ecosystem.get_status()
    }
    
    // ========== ВНУТРЕННИЕ МЕТОДЫ ==========
    
    fn handle_events(&mut self, events: Vec<GameEvent>) {
        for event in events {
            let _ = self.ui.handle_event(&event);
        }
        let _ = self.ui.render(&self.state);
        self.save();
    }
    
    fn load(&mut self) {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                if let Ok(Some(saved_state)) = storage.get_item("corebox_save") {
                    match serde_json::from_str::<GameState>(&saved_state) {
                        Ok(mut state) => {
                            let config_guard = CONFIG.lock().unwrap();
                            state.max_computational_power = config_guard.auto_click_config.max_computational_power;
                            
                            self.neuro_ecosystem.load_from_state(
                                state.neuro_evolution, 
                                state.neuro_consciousness,
                                state.neuro_score
                            );
                            
                            self.neuro_ecosystem.last_processed_time = state.game_time;
                            
                            state.neuro_defense_bonus = self.neuro_ecosystem.get_defense_bonus();
                            state.neuro_prediction_bonus = self.neuro_ecosystem.get_prediction_bonus();
                            
                            self.rebel_system.after_deserialize();
                            
                            if state.game_time <= 0 {
                                state.game_time = if state.is_day {
                                    config_guard.time_config.day_duration
                                } else {
                                    config_guard.time_config.night_duration
                                };
                            }
                            
                            if state.current_quest >= state.quests.len() {
                                state.current_quest = state.quests.len().saturating_sub(1);
                            }
                            
                            self.state = state;
                        }
                        Err(e) => {
                            web_sys::console::error_1(&format!("❌ Ошибка загрузки состояния: {}", e).into());
                            let config_guard = CONFIG.lock().unwrap();
                            self.state = GameState::new(&config_guard);
                        }
                    }
                }
            }
        }
    }
    
    fn save(&self) {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                let mut state_to_save = self.state.clone();
                state_to_save.neuro_evolution = self.neuro_ecosystem.evolution_level;
                state_to_save.neuro_consciousness = self.neuro_ecosystem.system_consciousness;
                state_to_save.neuro_score = self.neuro_ecosystem.get_evolution_score();
                
                if let Ok(state_json) = serde_json::to_string(&state_to_save) {
                    let _ = storage.set_item("corebox_save", &state_json);
                }
            }
        }
    }
    
    fn update_config(&mut self, new_config: GameConfig) {
        self.mining_system = MiningSystem::new(new_config.mining_config.clone());
        self.economy_system = EconomySystem::new(new_config.economy_config.clone());
        self.upgrade_system = UpgradeSystem::new(new_config.upgrade_config.clone());
        self.state.max_computational_power = new_config.auto_click_config.max_computational_power;
        
        let old_quests = std::mem::take(&mut self.state.quests);
        self.state.load_quests(&new_config);
        
        for old_quest in old_quests {
            if let Some(new_quest) = self.state.quests.iter_mut().find(|q| q.id == old_quest.id) {
                new_quest.completed = old_quest.completed;
            }
        }
        
        *CONFIG.lock().unwrap() = new_config;
        let _ = self.ui.render(&self.state);
    }
    
    // ========== ОСНОВНЫЕ МЕХАНИКИ ==========
    
    fn add_manual_click_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if !self.state.is_ai_active() {
            events.push(GameEvent::LogMessage("❌ Система неактивна! Включите ТЭЦ или дождитесь дня".to_string()));
            return events;
        }
        
        self.state.manual_clicks += 1;
        
        let config_guard = CONFIG.lock().unwrap();
        let clicks_per_power = config_guard.auto_click_config.clicks_per_power;
        
        if self.state.manual_clicks >= clicks_per_power {
            let base_power = config_guard.auto_click_config.power_per_manual_click;
            let power_to_add = base_power + self.state.power_tier;
            self.state.manual_clicks = 0;
            self.state.computational_power = (self.state.computational_power + power_to_add)
                .min(self.state.max_computational_power);
            
            events.push(GameEvent::ComputationalPowerAdded { 
                amount: power_to_add, 
                total: self.state.computational_power 
            });
            
            let tier_events = self.check_power_tier();
            events.extend(tier_events);
        }
        
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
    
    fn buy_rebel_protection_internal(&mut self) -> Vec<GameEvent> {
        self.state.buy_rebel_protection()
    }
    
    fn toggle_rebel_protection_internal(&mut self) -> Vec<GameEvent> {
        self.state.toggle_rebel_protection()
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
    
    fn mine_resources_internal(&mut self) -> Vec<GameEvent> {
        if !self.state.is_ai_active() {
            return vec![GameEvent::LogMessage("❌ Система неактивна! Включите ТЭЦ или дождитесь дня".to_string())];
        }
        
        self.mining_system.mine_resources(&mut self.state, &self.neuro_ecosystem)
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
    
    fn check_ai_coal_passive(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        let saved_coal = self.state.total_coal_mined
            .saturating_sub(self.state.total_coal_burned);
        
        let thresholds: &[(u32, u32)] = &[
            (100, 15),
            (300, 25),
            (600, 40),
            (1000, 60),
        ];
        
        for &(threshold, points) in thresholds {
            if saved_coal >= threshold && self.state.last_ai_coal_threshold < threshold {
                self.state.last_ai_coal_threshold = threshold;
                self.neuro_ecosystem.evolution_score += points;
                self.state.neuro_score = self.neuro_ecosystem.get_evolution_score();
                events.push(GameEvent::LogMessage(format!(
                    "🧠 ИИ-пассив: {} угля сохранено → +{} очков эволюции",
                    threshold, points
                )));
            }
        }
        
        events
    }
    
    fn check_power_tier(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if self.state.computational_power >= self.state.max_computational_power {
            self.state.power_tier += 1;
            self.state.max_computational_power = 1000 * (self.state.power_tier + 1);
            events.push(GameEvent::LogMessage(format!(
                "⚡ Порог мощности! Лимит расширен до {} | Мощность/клик: {}",
                self.state.max_computational_power,
                self.state.power_tier + 1
            )));
        }
        
        events
    }
    
    fn game_loop_internal(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        let config_guard = CONFIG.lock().unwrap();
        
        let time_events = self.state.update_time(1, &config_guard);
        events.extend(time_events);
        
        let mut had_rebel_attack = false;
        let mut was_defended = false;
        
        if !self.state.rebel_protection_active {
            events.extend(self.rebel_system.update_rebel_activity(&mut self.state, &config_guard));
            
            let rebel_events = self.rebel_system.check_rebel_attack(&mut self.state, &config_guard);
            had_rebel_attack = !rebel_events.is_empty();
            
            was_defended = rebel_events.iter().any(|e| {
                matches!(e, GameEvent::LogMessage(msg) if msg.contains("отражена"))
            });
            
            if had_rebel_attack {
                self.state.last_rebel_attack_time = self.state.game_time;
                self.state.record_defense_result(was_defended);
                
                for event in &rebel_events {
                    if let GameEvent::RebelAttack { attack_type, .. } = event {
                        self.state.last_rebel_attack_type = attack_type.clone();
                        break;
                    }
                }
            }
            
            events.extend(rebel_events);
        }
        
        if self.state.is_ai_active() {
            self.state.neuro_defense_bonus = self.neuro_ecosystem.get_defense_bonus();
            self.state.neuro_prediction_bonus = self.neuro_ecosystem.get_prediction_bonus();
        }
        
        let ai_passive_events = self.check_ai_coal_passive();
        events.extend(ai_passive_events);
        
        if self.state.is_ai_active() {
            self.state.neuro_evolution_timer += 1;
            if self.state.neuro_evolution_timer >= 15 {
                self.state.neuro_evolution_timer = 0;
                
                let evolution_events = self.neuro_ecosystem.check_evolution(&mut self.state, &mut self.rebel_system);
                events.extend(evolution_events);
            }
        }
        
        if self.state.is_ai_active() {
            let neuro_events = self.neuro_ecosystem.process_threat(
                &mut self.state,
                &mut self.rebel_system,
                &config_guard,
                had_rebel_attack,
                was_defended
            );
            events.extend(neuro_events);
        }
        
        events.extend(self.mining_system.passive_mining(&mut self.state, &self.neuro_ecosystem));
        
        if self.state.auto_clicking {
            self.state.last_auto_click_time += 1;
            
            let base_interval = config_guard.auto_click_config.auto_click_interval;
            let effective_interval = if self.state.autoclick_debuff_remaining > 0 {
                let slowdown = 1.0 + self.state.autoclick_debuff_percent as f64;
                (base_interval as f64 * slowdown) as i32
            } else {
                base_interval
            };
            
            if self.state.last_auto_click_time >= effective_interval {
                let base_power = config_guard.auto_click_config.power_per_auto_click;
                let power_cost = base_power + self.state.power_tier;
                
                if self.state.computational_power >= power_cost {
                    self.state.computational_power -= power_cost;
                    self.state.last_auto_click_time = 0;
                    
                    let mining_events = self.mining_system.auto_mine_resources(&mut self.state, &self.neuro_ecosystem);
                    events.extend(mining_events);
                    
                    let tier_events = self.check_power_tier();
                    events.extend(tier_events);
                } else {
                    self.state.auto_clicking = false;
                    events.push(GameEvent::ComputationalPowerDepleted);
                    events.push(GameEvent::LogMessage(
                        "❌ Недостаточно мощности! Автоклики отключены".to_string()
                    ));
                }
            }
        }
        
        if self.state.current_quest < self.state.quests.len() {
            let current_quest_index = self.state.current_quest;
            let quest_completed = {
                let quest = &self.state.quests[current_quest_index];
                !quest.completed && quest.check_completion(&self.state)
            };
            
            if quest_completed {
                let quest = &mut self.state.quests[current_quest_index];
                
                if quest.reward > 0 {
                    self.state.inventory.trash += quest.reward / 10;
                    events.push(GameEvent::LogMessage(
                        format!("🎁 Награда за квест: {} мусора", quest.reward / 10)
                    ));
                }
                
                events.push(GameEvent::QuestCompleted {
                    title: quest.title.clone(),
                    reward: quest.reward,
                });
                
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
                            events.push(GameEvent::LogMessage("🔓 Разблокирована торговля углем!".to_string()));
                        }
                        _ => {}
                    }
                }
                
                quest.completed = true;
                self.state.current_quest += 1;
            }
        }
        
        if self.state.game_time % 30 == 0 && self.state.game_time > 0 {
            let neuro_status = self.neuro_ecosystem.get_debug_info();
            let rebel_status = self.rebel_system.get_debug_info();
            events.push(GameEvent::LogMessage(format!("🧠 {}", neuro_status)));
            events.push(GameEvent::LogMessage(format!("🌙 {}", rebel_status)));
        }
        
        events
    }
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