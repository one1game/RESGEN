use super::events::GameEvent;
use serde::{Serialize, Deserialize};
use super::config::GameConfig;

#[derive(Serialize, Deserialize, Clone)]
pub struct GameState {
    pub tng: u32,
    pub game_time: i32,
    pub is_day: bool,
    pub time_changed: bool,
    pub coal_enabled: bool,
    pub coal_unlocked: bool,
    pub trash_unlocked: bool,
    pub chips_unlocked: bool,
    pub plasma_unlocked: bool,
    pub chips_trade_unlocked: bool,
    pub plasma_trade_unlocked: bool,
    pub total_mined: u32,
    pub nights_survived: u32,
    pub rebel_activity: u32,
    pub current_quest: usize,
    pub inventory: Inventory,
    pub upgrades: Upgrades,
    pub quests: Vec<Quest>, // ← ИЗМЕНИЛ unlocks на quests
    
    // НОВЫЕ ПОЛЯ ДЛЯ СИСТЕМЫ КЛИКОВ
    pub auto_clicking: bool,
    pub computational_power: u32,
    pub max_computational_power: u32,
    pub last_auto_click_time: i32,
    pub manual_clicks: u32, // Счетчик ручных кликов для накопления мощности
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Inventory {
    pub coal: u32,
    pub trash: u32,
    pub chips: u32,
    pub plasma: u32,
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
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            tng: 0,
            game_time: 40,
            is_day: true,
            time_changed: false,
            coal_enabled: false,
            coal_unlocked: true,
            trash_unlocked: true,
            chips_unlocked: false,
            plasma_unlocked: false,
            chips_trade_unlocked: false,
            plasma_trade_unlocked: false,
            total_mined: 0,
            nights_survived: 0,
            rebel_activity: 0,
            current_quest: 0,
            inventory: Inventory {
                coal: 0,
                trash: 0,
                chips: 0,
                plasma: 0,
            },
            upgrades: Upgrades {
                mining: 0,
                defense: false,
                defense_level: 0,
            },
            quests: Vec::new(), // ← ИЗМЕНИЛ unlocks на quests
            
            // НОВЫЕ ПОЛЯ ДЛЯ СИСТЕМЫ КЛИКОВ - ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ
            auto_clicking: false,
            computational_power: 0,
            max_computational_power: 100, // ← РАЗУМНОЕ ЗНАЧЕНИЕ ПО УМОЛЧАНИЮ
            last_auto_click_time: 0,
            manual_clicks: 0,
        }
    }
}

impl GameState {
    pub fn new(config: &GameConfig) -> Self {
        let mut state = Self::default();
        state.game_time = config.time_config.initial_time;
        state.is_day = config.time_config.start_at_day;
        state.max_computational_power = config.auto_click_config.max_computational_power;
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
                "ActivateDefense" => QuestType::ActivateDefense,
                _ => {
                    web_sys::console::warn_1(&format!("⚠️ Unknown quest type: {}", quest_config.quest_type).into());
                    QuestType::MineAny
                },
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
    
        // Сортируем квесты по порядку
        self.quests.sort_by(|a, b| a.order.cmp(&b.order));
        
        // Находим первый незавершенный квест
        self.current_quest = 0;
        while self.current_quest < self.quests.len() && self.quests[self.current_quest].completed {
            self.current_quest += 1;
        }
    }

    pub fn update_time(&mut self, delta: i32, config: &GameConfig) -> Vec<GameEvent> {
        let mut events = Vec::new();
        self.time_changed = false;
        self.game_time -= delta;
    
        if self.game_time <= 0 {
            let was_day = self.is_day;
            self.is_day = !self.is_day;
            self.game_time = if self.is_day {
                config.time_config.day_duration
            } else {
                config.time_config.night_duration
            };
            self.time_changed = true;
    
            // ОБРАБОТКА РАСХОДА УГЛЯ ДЛЯ ТЭЦ
            if self.coal_enabled && self.inventory.coal > 0 {
                let coal_cost = if self.is_day { 
                    1
                } else { 
                    2
                };
                
                if self.inventory.coal >= coal_cost {
                    self.inventory.coal -= coal_cost;
                    events.push(GameEvent::LogMessage(
                        format!("🪨 {} угля потрачено на работу ТЭЦ", coal_cost)
                    ));
                    
                    // Проверяем, не закончился ли уголь
                    if self.inventory.coal == 0 {
                        self.coal_enabled = false;
                        events.push(GameEvent::CoalDepleted);
                        events.push(GameEvent::LogMessage("🔋 Уголь закончился! ТЭЦ отключена".to_string()));
                    }
                } else {
                    // Недостаточно угля для продолжения работы
                    self.coal_enabled = false;
                    events.push(GameEvent::CoalDepleted);
                    events.push(GameEvent::LogMessage("❌ Недостаточно угля! ТЭЦ отключена".to_string()));
                }
            }
    
            // ОБРАБОТКА СМЕНЫ ДНЯ/НОЧИ
            if !self.is_day && was_day {
                self.nights_survived += 1;
                events.push(GameEvent::NightStarted);
                events.push(GameEvent::LogMessage("🌙 Наступила ночь".to_string()));
            } else if self.is_day && !was_day {
                events.push(GameEvent::DayStarted);
                events.push(GameEvent::LogMessage("☀️ Наступил день".to_string()));
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

    // ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ СИСТЕМЫ КЛИКОВ
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
}

impl Quest {
    pub fn check_completion(&self, state: &GameState) -> bool {
        if self.completed {
            return true;
        }

        match &self.quest_type {
            QuestType::MineAny => state.total_mined >= self.target,
            QuestType::SurviveNight => state.nights_survived >= self.target,
            QuestType::MineResource(resource) => match resource.as_str() {
                "coal" => state.inventory.coal >= self.target,
                "chips" => state.inventory.chips >= self.target,
                "plasma" => state.inventory.plasma >= self.target,
                _ => false,
            },
            QuestType::ActivateDefense => state.upgrades.defense,
        }
    }

    pub fn get_progress(&self, state: &GameState) -> (u32, u32) {
        let current = match &self.quest_type {
            QuestType::MineAny => state.total_mined,
            QuestType::SurviveNight => state.nights_survived,
            QuestType::MineResource(resource) => match resource.as_str() {
                "coal" => state.inventory.coal,
                "chips" => state.inventory.chips,
                "plasma" => state.inventory.plasma,
                _ => 0,
            },
            QuestType::ActivateDefense => if state.upgrades.defense { 1 } else { 0 },
        };

        (current.min(self.target), self.target)
    }

    pub fn get_progress_percentage(&self, state: &GameState) -> u32 {
        let (current, target) = self.get_progress(state);
        if target == 0 {
            0
        } else {
            ((current as f32 / target as f32) * 100.0) as u32
        }
    }
}

// РЕАЛИЗАЦИЯ ДЛЯ ИНВЕНТАРЯ
impl Inventory {
    pub fn total_count(&self) -> u32 {
        self.coal + self.trash + self.chips + self.plasma
    }

    pub fn has_resource(&self, resource: &str) -> bool {
        match resource {
            "coal" => self.coal > 0,
            "trash" => self.trash > 0,
            "chips" => self.chips > 0,
            "plasma" => self.plasma > 0,
            _ => false,
        }
    }

    pub fn get_count(&self, resource: &str) -> u32 {
        match resource {
            "coal" => self.coal,
            "trash" => self.trash,
            "chips" => self.chips,
            "plasma" => self.plasma,
            _ => 0,
        }
    }
}