// ======== src/game/state.rs (ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ С ТУРБИНОЙ, ТИПАМИ НОЧЕЙ И last_click_time) ========

use serde::{Serialize, Deserialize};
use super::config::GameConfig;
use rand::Rng;
use std::collections::VecDeque;

// ========== СТРУКТУРА ДЛЯ ИСТОРИИ АТАК ==========

#[derive(Serialize, Deserialize, Clone)]
pub struct AttackRecord {
    pub faction: String,
    pub attack_type: String,
    pub was_defended: bool,
    pub result: String,
    pub game_time: i32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GameState {
    // Время и циклы
    pub game_time: i32,
    pub is_day: bool,
    pub time_changed: bool,
    
    // Системы
    pub coal_enabled: bool,
    
    // Разблокировки
    pub coal_unlocked: bool,
    pub trash_unlocked: bool,
    pub chips_unlocked: bool,
    pub plasma_unlocked: bool,
    pub ore_unlocked: bool,
    
    // Статистика добычи
    pub total_mined: u32,
    pub nights_survived: u32,
    
    // Повстанцы
    pub rebel_activity: u32,
    
    // ТУРБИНА
    pub turbine_heat: u32,          // 0–100, перегрев турбины
    pub turbine_upgrade_level: u32, // 0–5, уровень улучшения турбины
    pub turbine_cooling: bool,      // true = турбина остывает, добыча заблокирована
    
    // Время последнего клика для расчета нагрева
    pub last_click_time: u64,       // Unix timestamp в миллисекундах
    
    // Квесты
    pub current_quest: usize,
    
    // Инвентарь
    pub inventory: Inventory,
    
    // Улучшения
    pub upgrades: Upgrades,
    
    // Квесты (список)
    pub quests: Vec<Quest>,
    
    // Энергетика
    pub total_coal_burned: u32,
    pub plasma_from_coal: u32,
    
    // Автокликер
    pub auto_clicking: bool,
    pub computational_power: u32,
    pub max_computational_power: u32,
    pub last_auto_click_time: i32,
    pub manual_clicks: u32,
    
    // Защита от повстанцев
    pub rebel_protection_nights: u32,
    pub rebel_protection_active: bool,
    
    // Статистика ресурсов
    pub total_coal_mined: u32,
    pub total_trash_mined: u32,
    pub total_plasma_mined: u32,
    pub total_ore_mined: u32,
    pub total_coal_stolen: u32,
    pub total_ore_stolen: u32,
    
    // Боевая статистика
    pub attacks_defended: u32,
    pub rebel_attacks_count: u32,
    
    // Нейро-система
    pub neuro_evolution: u32,
    pub neuro_consciousness: f64,
    pub neuro_score: u32,
    
    // Бонусы от нейро-системы
    pub neuro_defense_bonus: f64,
    pub neuro_prediction_bonus: f64,
    
    // Последняя атака повстанцев
    pub last_rebel_attack_time: i32,
    pub last_rebel_attack_type: String,
    pub last_attack_was_defended: bool,
    
    // Статистика защит
    pub consecutive_successful_defenses: u32,
    pub consecutive_failed_defenses: u32,
    pub total_defense_activations: u32,
    
    // Модификаторы
    pub temporary_mining_bonus: u32,
    pub temporary_defense_bonus: u32,
    pub temporary_bonus_remaining: i32,
    
    // Достижения и прогресс
    pub highest_rebel_activity: u32,
    pub longest_defense_streak: u32,
    pub total_evolution_points_earned: u32,
    
    // Таймеры для пассивного роста нейро-системы
    pub neuro_passive_timer: i32,
    pub neuro_evolution_timer: i32,
    
    // Последствия атак (временные дебаффы)
    pub defense_debuff_remaining: i32,
    pub mining_debuff_remaining: i32,
    pub mining_debuff_percent: f32,
    pub autoclick_debuff_remaining: i32,
    pub autoclick_debuff_percent: f32,
    
    // История атак (последние 5)
    pub attack_history: VecDeque<AttackRecord>,
    
    // Последняя фракция-атакующий
    pub last_attacking_faction: String,
    
    // Текущий режим ИИ (для отображения)
    pub current_ai_mode: String,
    
    // Предупреждение об атаке от ИИ
    pub attack_warning: String,
    pub attack_warning_faction: String,
    
    // Чертежи
    pub blueprint_cargo_unlocked: bool,
    pub blueprint_scout_unlocked: bool,
    pub blueprint_combat_unlocked: bool,
    pub blueprint_research_progress: u32,
    
    // Типы ночей и блокировка торговли
    pub current_night_type: String,
    pub trade_blocked: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Inventory {
    pub coal: u32,
    pub trash: u32,
    pub chips: u32,
    pub plasma: u32,
    pub ore: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Upgrades {
    pub mining: u32,
    pub defense: bool,
    pub defense_level: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Quest {
    pub id: String,
    pub title: String,
    pub description: String,
    pub quest_type: QuestType,
    pub target: u32,
    pub reward: u32,
    pub enabled: bool,
    pub order: u32,
    pub completed: bool,
    pub unlocks: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum QuestType {
    MineAny,
    SurviveNight,
    MineResource(String),
    ActivateDefense,
    SurviveAttack,
    ReachEvolutionLevel,
    CollectResource(String),
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            game_time: 40,
            is_day: true,
            time_changed: false,
            coal_enabled: false,
            coal_unlocked: true,
            trash_unlocked: true,
            chips_unlocked: true,
            plasma_unlocked: false,
            ore_unlocked: true,
            total_mined: 0,
            nights_survived: 0,
            rebel_activity: 0,
            turbine_heat: 0,
            turbine_upgrade_level: 0,
            turbine_cooling: false,
            last_click_time: 0,
            current_quest: 0,
            inventory: Inventory {
                coal: 0,
                trash: 0,
                chips: 0,
                plasma: 0,
                ore: 0,
            },
            upgrades: Upgrades {
                mining: 0,
                defense: false,
                defense_level: 0,
            },
            quests: Vec::new(),
            total_coal_burned: 0,
            plasma_from_coal: 0,
            auto_clicking: false,
            computational_power: 0,
            max_computational_power: 1000,
            last_auto_click_time: 0,
            manual_clicks: 0,
            rebel_protection_nights: 0,
            rebel_protection_active: false,
            total_coal_mined: 0,
            total_trash_mined: 0,
            total_plasma_mined: 0,
            total_ore_mined: 0,
            total_coal_stolen: 0,
            total_ore_stolen: 0,
            attacks_defended: 0,
            rebel_attacks_count: 0,
            neuro_evolution: 0,
            neuro_consciousness: 0.05,
            neuro_score: 0,
            neuro_defense_bonus: 0.0,
            neuro_prediction_bonus: 0.0,
            last_rebel_attack_time: -100,
            last_rebel_attack_type: String::new(),
            last_attack_was_defended: false,
            consecutive_successful_defenses: 0,
            consecutive_failed_defenses: 0,
            total_defense_activations: 0,
            temporary_mining_bonus: 0,
            temporary_defense_bonus: 0,
            temporary_bonus_remaining: 0,
            highest_rebel_activity: 0,
            longest_defense_streak: 0,
            total_evolution_points_earned: 0,
            neuro_passive_timer: 0,
            neuro_evolution_timer: 0,
            defense_debuff_remaining: 0,
            mining_debuff_remaining: 0,
            mining_debuff_percent: 0.0,
            autoclick_debuff_remaining: 0,
            autoclick_debuff_percent: 0.0,
            attack_history: VecDeque::new(),
            last_attacking_faction: String::new(),
            current_ai_mode: "Обычный".to_string(),
            attack_warning: String::new(),
            attack_warning_faction: String::new(),
            blueprint_cargo_unlocked: false,
            blueprint_scout_unlocked: false,
            blueprint_combat_unlocked: false,
            blueprint_research_progress: 0,
            current_night_type: String::new(),
            trade_blocked: false,
        }
    }
}

impl GameState {
    pub fn new(config: &GameConfig) -> Self {
        let mut state = Self::default();
        state.game_time = config.time_config.initial_time;
        state.is_day = config.time_config.start_at_day;
        state.max_computational_power = config.auto_click_config.max_computational_power;
        state.inventory.ore = config.game_balance_config.initial_ore;
        state.inventory.coal = config.game_balance_config.initial_coal;
        state.inventory.trash = config.game_balance_config.initial_trash;
        state.inventory.chips = config.game_balance_config.initial_chips;
        state.inventory.plasma = config.game_balance_config.initial_plasma;
        state.load_quests(config);
        state
    }

    pub fn load_quests(&mut self, config: &GameConfig) {
        self.quests.clear();
        
        for quest_config in &config.quests {
            if !quest_config.enabled {
                continue;
            }
    
            let quest_type = match quest_config.quest_type.as_str() {
                "MineAny" => QuestType::MineAny,
                "SurviveNight" => QuestType::SurviveNight,
                "MineCoal" => QuestType::MineResource("coal".to_string()),
                "MineChips" => QuestType::MineResource("chips".to_string()),
                "MinePlasma" => QuestType::MineResource("plasma".to_string()),
                "MineOre" => QuestType::MineResource("ore".to_string()),
                "ActivateDefense" => QuestType::ActivateDefense,
                "SurviveAttack" => QuestType::SurviveAttack,
                "ReachEvolutionLevel" => QuestType::ReachEvolutionLevel,
                _ => QuestType::MineAny,
            };
    
            self.quests.push(Quest {
                id: quest_config.id.clone(),
                title: quest_config.title.clone(),
                description: quest_config.description.clone(),
                quest_type,
                target: quest_config.target,
                reward: quest_config.reward,
                enabled: quest_config.enabled,
                order: quest_config.order,
                completed: false,
                unlocks: quest_config.unlocks.clone(),
            });
        }
    
        self.quests.sort_by(|a, b| a.order.cmp(&b.order));
        self.current_quest = 0;
        while self.current_quest < self.quests.len() && self.quests[self.current_quest].completed {
            self.current_quest += 1;
        }
    }

    pub fn update_time(&mut self, delta: i32, config: &GameConfig) -> Vec<super::events::GameEvent> {
        use super::events::GameEvent;
        let mut events = Vec::new();
        
        // Остывание турбины
        let cooling_rate = 2u32 + self.turbine_upgrade_level;
        if self.turbine_heat > 0 {
            self.turbine_heat = self.turbine_heat.saturating_sub(cooling_rate);
            if self.turbine_heat == 0 && self.turbine_cooling {
                self.turbine_cooling = false;
                events.push(GameEvent::LogMessage("🌡️ Турбина остыла. Добыча разблокирована!".to_string()));
            }
        }
        
        let was_day = self.is_day;
        self.time_changed = false;
        self.game_time -= delta;
        
        if self.mining_debuff_remaining > 0 {
            self.mining_debuff_remaining -= 1;
            if self.mining_debuff_remaining == 0 {
                self.mining_debuff_percent = 0.0;
                events.push(GameEvent::LogMessage("🔧 Технологический саботаж устранён. Добыча восстановлена.".to_string()));
            }
        }
        
        if self.autoclick_debuff_remaining > 0 {
            self.autoclick_debuff_remaining -= 1;
            if self.autoclick_debuff_remaining == 0 {
                self.autoclick_debuff_percent = 0.0;
                events.push(GameEvent::LogMessage("🧠 Психологическое воздействие ослабло. Автокликер в норме.".to_string()));
            }
        }
    
        if self.game_time <= 0 {
            self.is_day = !self.is_day;
            self.game_time = if self.is_day {
                config.time_config.day_duration
            } else {
                config.time_config.night_duration
            };
            self.time_changed = true;
    
            if self.is_day && !was_day && self.defense_debuff_remaining > 0 {
                self.defense_debuff_remaining -= 1;
                if self.defense_debuff_remaining == 0 {
                    events.push(GameEvent::LogMessage("🛡️ Система защиты восстановлена после атаки.".to_string()));
                }
            }
    
            if self.temporary_bonus_remaining > 0 {
                self.temporary_bonus_remaining -= 1;
                if self.temporary_bonus_remaining <= 0 {
                    self.temporary_mining_bonus = 0;
                    self.temporary_defense_bonus = 0;
                    events.push(GameEvent::LogMessage("⏰ Временные бонусы истекли".to_string()));
                }
            }
    
            if self.coal_enabled && self.inventory.coal > 0 {
                let mut rng = rand::thread_rng();
                
                let coal_cost = if self.is_day { 
                    rng.gen_range(config.coal_consumption_config.day_coal_min..=config.coal_consumption_config.day_coal_max)
                } else { 
                    rng.gen_range(config.coal_consumption_config.night_coal_min..=config.coal_consumption_config.night_coal_max)
                };
                
                let actual_coal_burned = coal_cost.min(self.inventory.coal);
                
                if actual_coal_burned > 0 {
                    self.inventory.coal -= actual_coal_burned;
                    self.total_coal_burned += actual_coal_burned;
                    
                    events.push(GameEvent::LogMessage(
                        format!("🪨 Сожжено {} угля для работы ТЭЦ", actual_coal_burned)
                    ));
                    
                    let plasma_generated = self.total_coal_burned / config.coal_consumption_config.plasma_conversion_rate;
                    if plasma_generated > self.plasma_from_coal {
                        let new_plasma = plasma_generated - self.plasma_from_coal;
                        self.inventory.plasma += new_plasma;
                        self.plasma_from_coal = plasma_generated;
                        
                        self.total_plasma_mined += new_plasma;
                        
                        events.push(GameEvent::ResourceMined {
                            resource: "plasma".to_string(),
                            amount: new_plasma,
                            critical: false,
                        });
                        events.push(GameEvent::LogMessage(
                            format!("⚡ Побочный продукт: получено {} плазмы от сгорания угля", new_plasma)
                        ));
                        
                        if !self.plasma_unlocked && new_plasma > 0 {
                            self.plasma_unlocked = true;
                            events.push(GameEvent::LogMessage("🔓 Разблокирована плазма!".to_string()));
                        }
                    }
                    
                    if self.inventory.coal == 0 {
                        self.coal_enabled = false;
                        events.push(GameEvent::CoalDepleted);
                        events.push(GameEvent::LogMessage("🔋 Уголь закончился! ТЭЦ отключена".to_string()));
                    }
                } else {
                    self.coal_enabled = false;
                    events.push(GameEvent::CoalDepleted);
                    events.push(GameEvent::LogMessage("❌ Недостаточно угля! ТЭЦ отключена".to_string()));
                }
            }
    
            if !self.is_day && was_day {
                self.nights_survived += 1;
                events.push(GameEvent::NightStarted);
                events.push(GameEvent::LogMessage("🌙 Наступила ночь".to_string()));
                
                if self.rebel_protection_active && self.rebel_protection_nights > 0 {
                    self.rebel_protection_nights -= 1;
                    events.push(GameEvent::LogMessage(
                        "🛡️ Защита от повстанцев активирована на эту ночь".to_string()
                    ));
                    
                    if self.rebel_protection_nights == 0 {
                        self.rebel_protection_active = false;
                        events.push(GameEvent::LogMessage(
                            "🛡️ Защита от повстанцев закончилась".to_string()
                        ));
                    }
                }
                
            } else if self.is_day && !was_day {
                events.push(GameEvent::DayStarted);
                events.push(GameEvent::LogMessage("☀️ Наступил день".to_string()));
                // Сброс блокировки торговли
                self.trade_blocked = false;
                if self.current_night_type == "siege" {
                    events.push(GameEvent::LogMessage("🔓 Осада снята — торговля возобновлена".to_string()));
                }
            }
        }
        
        events
    }

    pub fn is_ai_active(&self) -> bool {
        self.is_day || (self.coal_enabled && self.inventory.coal > 0)
    }

    pub fn is_passive_mining_active(&self) -> bool {
        (self.coal_enabled && self.inventory.coal > 0) || self.is_day
    }

    pub fn can_auto_click(&self) -> bool {
        self.computational_power > 0 && self.is_ai_active()
    }

    pub fn get_power_percentage(&self) -> f32 {
        if self.max_computational_power == 0 {
            0.0
        } else {
            (self.computational_power as f32 / self.max_computational_power as f32) * 100.0
        }
    }

    pub fn reset_click_progress(&mut self) {
        self.manual_clicks = 0;
    }
    
    pub fn buy_rebel_protection(&mut self) -> Vec<super::events::GameEvent> {
        use super::events::GameEvent;
        let mut events = Vec::new();
        
        if self.inventory.trash >= 100 {
            self.inventory.trash -= 100;
            self.rebel_protection_nights += 1;
            events.push(GameEvent::LogMessage(
                format!("🛡️ Куплена защита от повстанцев на 1 ночь! Осталось ночей: {}", self.rebel_protection_nights)
            ));
        } else {
            events.push(GameEvent::LogMessage(
                "❌ Недостаточно мусора для покупки защиты (нужно 100)".to_string()
            ));
        }
        
        events
    }
    
    pub fn toggle_rebel_protection(&mut self) -> Vec<super::events::GameEvent> {
        use super::events::GameEvent;
        let mut events = Vec::new();
        
        if self.rebel_protection_active {
            self.rebel_protection_active = false;
            events.push(GameEvent::LogMessage("🛡️ Защита от повстанцев деактивирована".to_string()));
        } else if self.rebel_protection_nights > 0 {
            self.rebel_protection_active = true;
            events.push(GameEvent::LogMessage(
                format!("🛡️ Защита от повстанцев активирована! Осталось ночей: {}", self.rebel_protection_nights)
            ));
        } else {
            events.push(GameEvent::LogMessage("❌ Нет доступных ночей защиты".to_string()));
        }
        
        events
    }
    
    pub fn record_defense_result(&mut self, was_successful: bool) {
        if was_successful {
            self.consecutive_successful_defenses += 1;
            self.consecutive_failed_defenses = 0;
            self.attacks_defended += 1;
            
            if self.consecutive_successful_defenses > self.longest_defense_streak {
                self.longest_defense_streak = self.consecutive_successful_defenses;
            }
        } else {
            self.consecutive_successful_defenses = 0;
            self.consecutive_failed_defenses += 1;
        }
    }
    
    pub fn update_rebel_activity(&mut self, new_activity: u32) {
        self.rebel_activity = new_activity;
        if new_activity > self.highest_rebel_activity {
            self.highest_rebel_activity = new_activity;
        }
    }
    
    pub fn add_evolution_points(&mut self, points: u32) {
        self.neuro_score += points;
        self.total_evolution_points_earned += points;
    }
    
    pub fn get_total_mining_bonus(&self, config: &GameConfig) -> u32 {
        let mut bonus = config.game_balance_config.base_mining_bonus;
        bonus += self.upgrades.mining;
        if self.coal_enabled {
            bonus += config.game_balance_config.coal_mining_bonus;
        }
        if self.ore_unlocked {
            bonus += config.game_balance_config.ore_mining_bonus;
        }
        bonus += self.temporary_mining_bonus;
        
        if self.mining_debuff_percent > 0.0 {
            let reduction = (bonus as f32 * self.mining_debuff_percent) as u32;
            bonus = bonus.saturating_sub(reduction);
        }
        
        bonus
    }
    
    pub fn get_total_defense_bonus(&self, config: &GameConfig) -> u32 {
        let effective_defense_level = if self.defense_debuff_remaining > 0 {
            self.upgrades.defense_level.saturating_sub(1)
        } else {
            self.upgrades.defense_level
        };
        
        let mut bonus = effective_defense_level * config.upgrade_config.defense_level_bonus;
        bonus += config.upgrade_config.defense_base_power;
        bonus += self.temporary_defense_bonus;
        bonus += (self.neuro_defense_bonus * 50.0) as u32;
        
        bonus
    }
    
    pub fn add_attack_record(&mut self, faction: String, attack_type: String, was_defended: bool, result: String) {
        let record = AttackRecord {
            faction: faction.clone(),
            attack_type,
            was_defended,
            result,
            game_time: self.game_time,
        };
        
        self.attack_history.push_back(record);
        self.last_attacking_faction = faction;
        
        while self.attack_history.len() > 5 {
            self.attack_history.pop_front();
        }
    }
    
    pub fn apply_attack_debuffs(&mut self, defense_damage: bool, mining_damage: bool, autoclick_damage: bool) {
        if defense_damage {
            self.defense_debuff_remaining = 2;
            self.current_ai_mode = "Ослаблен (защита повреждена)".to_string();
        }
        
        if mining_damage {
            self.mining_debuff_remaining = 60;
            self.mining_debuff_percent = 0.3;
        }
        
        if autoclick_damage {
            self.autoclick_debuff_remaining = 90;
            self.autoclick_debuff_percent = 0.5;
        }
    }
    
    pub fn set_attack_warning(&mut self, warning: String, faction: String) {
        self.attack_warning = warning;
        self.attack_warning_faction = faction;
    }
    
    pub fn clear_attack_warning(&mut self) {
        self.attack_warning.clear();
        self.attack_warning_faction.clear();
    }
}

impl Quest {
    pub fn check_completion(&self, state: &GameState) -> bool {
        match &self.quest_type {
            QuestType::MineAny => state.total_mined >= self.target,
            QuestType::SurviveNight => state.nights_survived >= self.target,
            QuestType::MineResource(resource) => {
                match resource.as_str() {
                    "coal" => state.total_coal_mined >= self.target,
                    "chips" => state.inventory.chips >= self.target,
                    "plasma" => state.total_plasma_mined >= self.target,
                    "ore" => state.total_ore_mined >= self.target,
                    _ => false,
                }
            }
            QuestType::ActivateDefense => state.upgrades.defense,
            QuestType::SurviveAttack => state.rebel_attacks_count >= self.target,
            QuestType::ReachEvolutionLevel => state.neuro_evolution >= self.target,
            QuestType::CollectResource(resource) => match resource.as_str() {
                "coal" => state.total_coal_mined >= self.target,
                "ore" => state.total_ore_mined >= self.target,
                "plasma" => state.total_plasma_mined >= self.target,
                _ => false,
            },
        }
    }
}