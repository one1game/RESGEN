use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum GameEvent {
    LogMessage(String),
    ResourceMined {
        resource: String,
        amount: u32,
        critical: bool,
    },
    QuestCompleted {
        title: String,
        reward: u32,
    },
    RebelAttack {
        attack_type: String,
        details: String,
    },
    UpgradePurchased {
        upgrade_type: String,
        level: u32,
    },
    DefenseActivated,
    NotEnoughResources {
        resource: String,
        required: u32,
        available: u32,
    },
    CoalActivated,
    CoalDeactivated,
    CoalDepleted,
    DayStarted,
    NightStarted,
    
    // НОВЫЕ СОБЫТИЯ ДЛЯ СИСТЕМЫ КЛИКОВ
    ComputationalPowerAdded {
        amount: u32,
        total: u32,
    },
    ComputationalPowerDepleted,
    AutoClickingStarted,
    AutoClickingStopped,
}