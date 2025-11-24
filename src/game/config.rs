use serde::{Serialize, Deserialize};

// ОПРЕДЕЛЕНИЕ QuestConfig ДО GameConfig
#[derive(Serialize, Deserialize, Clone)]
pub struct QuestConfig {
    pub id: String,
    pub title: String,
    pub description: String,
    pub quest_type: String,  // Оставляем String, а не QuestType
    pub target: u32,
    pub reward: u32,
    pub enabled: bool,
    pub order: u32,
    pub unlocks: Vec<String>,
}

// ОДНО ОПРЕДЕЛЕНИЕ GameConfig
#[derive(Serialize, Deserialize, Clone)]
pub struct GameConfig {
    pub version: String,
    pub cycle_duration: i32,
    pub max_slots: usize,
    pub time_config: TimeConfig,
    pub mining_config: MiningConfig,
    pub economy_config: EconomyConfig,
    pub upgrade_config: UpgradeConfig,
    pub rebels: RebelConfig,
    pub quests: Vec<QuestConfig>,
    pub auto_click_config: AutoClickConfig,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TimeConfig {
    pub day_duration: i32,
    pub night_duration: i32,
    pub initial_time: i32,
    pub start_at_day: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MiningConfig {
    pub base_chances: BaseChances,
    pub upgrade_bonus: f64,
    pub coal_bonus: f64,
    pub critical_chance: f64,
    pub critical_multiplier: u32,
    pub passive_chances: PassiveChances,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BaseChances {
    pub coal: f64,
    pub trash: f64,
    pub chips: f64,
    pub plasma: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PassiveChances {
    pub coal: f64,
    pub trash: f64,
    pub chips: f64,
    pub plasma: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EconomyConfig {
    pub trash_base_price: u32,
    pub trade_prices: TradePrices,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TradePrices {
    pub coal_buy: u32,
    pub coal_sell: u32,
    pub chips_buy: u32,
    pub chips_sell: u32,
    pub plasma_buy: u32,
    pub plasma_sell: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct UpgradeConfig {
    pub mining_base_cost: u32,
    pub mining_cost_multiplier: u32,
    pub mining_max_level: u32,
    pub defense_activation_cost: u32,
    pub defense_base_power: u32,
    pub defense_level_bonus: u32,
    pub defense_max_level: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RebelConfig {
    pub base_attack_chance: f64,
    pub activity_increase: u32,
    pub activity_decrease: u32,
    pub max_activity: u32,
    pub activity_bonus_per_level: f64,
    pub max_attack_chance: f64,
    pub defense_base_power: u32,
    pub defense_level_bonus: u32,
    pub steal_rates: StealRates,
    pub disable_chances: DisableChances,
    pub power_reset_rate: f64,
    pub log_activity_threshold: u32,
    pub enable_attack_messages: bool,
    pub enable_defense_messages: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StealRates {
    pub low_activity_trash: f64,
    pub medium_activity_coal: f64,
    pub high_activity_chips: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DisableChances {
    pub coal_plant_disable: f64,
    pub power_reset: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AutoClickConfig {
    pub enabled: bool,
    pub max_computational_power: u32,
    pub clicks_per_power: u32,
    pub power_per_manual_click: u32,
    pub auto_click_interval: i32,
    pub power_per_auto_click: u32,
    pub use_same_chances_as_manual: bool,
    pub auto_click_chance_multiplier: f64,
    pub long_press_duration: u32,
    pub visual_feedback: bool,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            version: "3.0".to_string(),
            cycle_duration: 0,
            max_slots: 18,
            time_config: TimeConfig {
                day_duration: 0,
                night_duration: 0,
                initial_time: 0,
                start_at_day: true,
            },
            mining_config: MiningConfig {
                base_chances: BaseChances {
                    coal: 0.15,
                    trash: 0.10,
                    chips: 0.04,
                    plasma: 0.02,
                },
                upgrade_bonus: 0.01,
                coal_bonus: 0.02,
                critical_chance: 0.03,
                critical_multiplier: 2,
                passive_chances: PassiveChances {
                    coal: 0.003,
                    trash: 0.007,
                    chips: 0.001,
                    plasma: 0.0005,
                },
            },
            economy_config: EconomyConfig {
                trash_base_price: 2,
                trade_prices: TradePrices {
                    coal_buy: 5,
                    coal_sell: 3,
                    chips_buy: 12,
                    chips_sell: 8,
                    plasma_buy: 20,
                    plasma_sell: 10,
                },
            },
            upgrade_config: UpgradeConfig {
                mining_base_cost: 5,
                mining_cost_multiplier: 2,
                mining_max_level: 10,
                defense_activation_cost: 3,
                defense_base_power: 30,
                defense_level_bonus: 10,
                defense_max_level: 5,
            },
            rebels: RebelConfig {
                base_attack_chance: 0.2,
                activity_increase: 1,
                activity_decrease: 2,
                max_activity: 10,
                activity_bonus_per_level: 0.03,
                max_attack_chance: 0.5,
                defense_base_power: 30,
                defense_level_bonus: 10,
                steal_rates: StealRates {
                    low_activity_trash: 0.16,
                    medium_activity_coal: 0.20,
                    high_activity_chips: 0.25,
                },
                disable_chances: DisableChances {
                    coal_plant_disable: 0.15,
                    power_reset: 0.10,
                },
                power_reset_rate: 0.25,
                log_activity_threshold: 2,
                enable_attack_messages: true,
                enable_defense_messages: true,
            },
            quests: vec![
                QuestConfig {
                    id: "quest1".to_string(),
                    title: "Первые шаги".to_string(),
                    description: "Добудьте 10 любых ресурсов".to_string(),
                    quest_type: "MineAny".to_string(),
                    target: 10,
                    reward: 50,
                    enabled: true,
                    order: 0,
                    unlocks: vec![],
                },
                QuestConfig {
                    id: "quest2".to_string(),
                    title: "Ночной страж".to_string(),
                    description: "Переживите 3 ночи".to_string(),
                    quest_type: "SurviveNight".to_string(),
                    target: 3,
                    reward: 100,
                    enabled: true,
                    order: 1,
                    unlocks: vec![],
                },
                QuestConfig {
                    id: "quest3".to_string(),
                    title: "Угольный магнат".to_string(),
                    description: "Накопите 20 угля".to_string(),
                    quest_type: "MineCoal".to_string(),
                    target: 20,
                    reward: 150,
                    enabled: true,
                    order: 2,
                    unlocks: vec![],
                },
            ],
            auto_click_config: AutoClickConfig {
                enabled: true,
                max_computational_power: 100,
                clicks_per_power: 10,
                power_per_manual_click: 1,
                auto_click_interval: 5,
                power_per_auto_click: 1,
                use_same_chances_as_manual: true,
                auto_click_chance_multiplier: 1.0,
                long_press_duration: 500,
                visual_feedback: true,
            },
        }
    }
}