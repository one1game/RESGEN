// save.js
// Сохранение и загрузка игровых данных в Supabase

import { supabase } from './supabase.js';

window.saveGameToCloud = saveGameToCloud;
window.loadGameFromCloud = loadGameFromCloud;

// ─────────────────────────────────────────────
// 💾 СОХРАНИТЬ ИГРУ В ОБЛАКО
// ─────────────────────────────────────────────
export async function saveGameToCloud(gameState) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.warn("Не авторизован - сохранение в облако невозможно");
            return { success: false, error: "Не авторизован" };
        }

        // Собираем quests из localStorage если есть
        let savedQuests = [];
        try {
            const q = localStorage.getItem('corebox_quests');
            if (q) savedQuests = JSON.parse(q);
        } catch(e) {}

        // Собираем чертежи из localStorage
        let blueprints = { cargo: false, scout: false, combat: false };
        try {
            const bp = localStorage.getItem('corebox_ship_blueprints');
            if (bp) {
                const parsed = JSON.parse(bp);
                parsed.forEach(b => {
                    if (b.id === 'cargo')  blueprints.cargo  = b.unlocked;
                    if (b.id === 'scout')  blueprints.scout  = b.unlocked;
                    if (b.id === 'combat') blueprints.combat = b.unlocked;
                });
            }
        } catch(e) {}

        // ─── Passive mining rates — читаем из конфига если доступен, иначе дефолты ───
        let passiveRates = { coal: 0.004, trash: 0.008, ore: 0.003 };
        try {
            const cfg = localStorage.getItem('corebox_config_cache');
            if (cfg) {
                const parsed = JSON.parse(cfg);
                const pc = parsed?.mining_config?.passive_chances;
                if (pc) passiveRates = { coal: pc.coal ?? 0.004, trash: pc.trash ?? 0.008, ore: pc.ore ?? 0.003 };
            }
        } catch(e) {}

        // Строим full_state точно по структуре GameState в Rust
        const fullState = {
            // ───── Время ─────
            game_time:    gameState.game_time || 0,
            is_day:       gameState.is_day !== undefined ? gameState.is_day : true,
            time_changed: false,

            // ───── Системы ─────
            coal_enabled: gameState.coal_enabled || false,

            // ───── Разблокировки ─────
            coal_unlocked:  true,
            trash_unlocked: true,
            chips_unlocked: true,
            plasma_unlocked: true,
            ore_unlocked:   true,

            // ───── Статистика добычи ─────
            total_mined:     (gameState.coal_mined || 0) + (gameState.trash_mined || 0) + (gameState.ore_mined || 0),
            nights_survived: gameState.nights_survived || 0,

            // ───── Повстанцы ─────
            rebel_activity: gameState.rebel_activity || 0,

            // ───── Турбина ─────
            turbine_heat:          gameState.turbine_heat          || 0,
            turbine_upgrade_level: gameState.turbine_upgrade_level || 0,
            turbine_cooling:       false,

            // ───── Клики ─────
            last_click_time: 0,
            current_quest:   0,

            // ───── Инвентарь ─────
            inventory: {
                coal:   gameState.coal_inventory   || 0,
                trash:  gameState.trash_inventory  || 0,
                chips:  gameState.chips_inventory  || 0,
                plasma: gameState.plasma_inventory || 0,
                ore:    gameState.ore_inventory    || 0,
            },

            // ───── Улучшения ─────
            upgrades: {
                mining:        gameState.crit_level    || 0,
                defense:       false,
                defense_level: gameState.cooling_level || 0,
                crit_level:    gameState.crit_level    || 0,
                cooling_level: gameState.cooling_level || 0,
            },

            // ───── Квесты ─────
            quests: savedQuests,

            // ───── Энергетика ─────
            total_coal_burned: gameState.coal_burned || 0,
            plasma_from_coal:  0,

            // ───── Автокликер ─────
            auto_clicking:            false,
            computational_power:      0,
            max_computational_power:  1000,
            last_auto_click_time:     0,
            manual_clicks:            gameState.total_clicks || 0,

            // ───── Защита ─────
            rebel_protection_nights: 0,
            rebel_protection_active: false,

            // ───── Статистика ресурсов ─────
            total_coal_mined:   gameState.coal_mined   || 0,
            total_trash_mined:  gameState.trash_mined  || 0,
            total_plasma_mined: gameState.plasma_mined || 0,
            total_ore_mined:    gameState.ore_mined    || 0,
            total_coal_stolen:  gameState.coal_stolen  || 0,
            total_ore_stolen:   0,

            // ───── Боевая статистика ─────
            attacks_defended:    gameState.attacks_defended || 0,
            rebel_attacks_count: gameState.rebel_attacks    || 0,

            // ───── Нейро ─────
            neuro_evolution:        gameState.neuro_evolution     || 0,
            neuro_consciousness:    (gameState.neuro_consciousness || 0) / 100,
            neuro_score:            gameState.neuro_score         || 0,
            neuro_defense_bonus:    gameState.defense_bonus       || 0,
            neuro_prediction_bonus: gameState.prediction_bonus    || 0,

            // ───── Атаки ─────
            last_rebel_attack_time:          0,
            last_rebel_attack_type:          "",
            last_attack_was_defended:        false,
            consecutive_successful_defenses: gameState.consecutive_successful_defenses || 0,
            consecutive_failed_defenses:     0,
            total_defense_activations:       0,

            // ───── Модификаторы ─────
            temporary_mining_bonus:    0,
            temporary_defense_bonus:   0,
            temporary_bonus_remaining: 0,

            // ───── Достижения ─────
            highest_rebel_activity:        0,
            longest_defense_streak:        gameState.longest_defense_streak || 0,
            total_evolution_points_earned: gameState.neuro_score || 0,

            // ───── Таймеры ─────
            neuro_passive_timer:    0,
            neuro_evolution_timer:  0,

            // ───── Дебаффы ─────
            defense_debuff_remaining:   0,
            mining_debuff_remaining:    0,
            mining_debuff_percent:      0.0,
            autoclick_debuff_remaining: 0,
            autoclick_debuff_percent:   0.0,

            // ───── История атак ─────
            attack_history:          [],
            last_attacking_faction:  gameState.last_attacking_faction || "",
            current_ai_mode:         gameState.current_ai_mode || "Обычный",
            attack_warning:          "",
            attack_warning_faction:  "",

            // ───── Чертежи ─────
            blueprint_cargo_unlocked:    blueprints.cargo,
            blueprint_scout_unlocked:    blueprints.scout,
            blueprint_combat_unlocked:   blueprints.combat,
            blueprint_research_progress: gameState.blueprint_research_progress || 0,

            // ───── Ночи ─────
            current_night_type: "",
            trade_blocked:      false,

            // ───── Прочее ─────
            power_tier:             gameState.power_tier    || 0,
            last_ai_coal_threshold: gameState.last_ai_coal_threshold || 0,  // ✅ ИСПРАВЛЕНИЕ БАГА 1
            prestige_level:         gameState.prestige_level || 0,

            // ─────────────────────────────────────────────────────
            // ⏰ ОФЛАЙН-ПРОГРЕСС — временная метка сохранения
            // Используется в game.js → calculateOfflineProgress()
            // для расчёта ресурсов и циклов, прошедших пока игра была закрыта
            // ─────────────────────────────────────────────────────
            _savedAt:        Date.now(),

            // Скорости пассивной добычи — копируем из конфига чтобы
            // при офлайн-расчёте использовать актуальные значения
            _passive_rates: passiveRates,

            // Вспомогательные данные для восстановления
            _blueprints:  [
                { id: 'cargo',  unlocked: blueprints.cargo  },
                { id: 'scout',  unlocked: blueprints.scout  },
                { id: 'combat', unlocked: blueprints.combat },
            ],
            _statistics: null, // заполняется ниже
        };

        // Пытаемся подтянуть статистику из localStorage чтобы не потерять при офлайне
        try {
            const users = JSON.parse(localStorage.getItem('corebox_users') || '{}');
            const { data: { user: u } } = await supabase.auth.getUser();
            if (u && users[u.email]?.statistics) {
                fullState._statistics = users[u.email].statistics;
            }
        } catch(e) {}

        const saveData = {
            user_id:          user.id,
            coal:             fullState.inventory.coal,
            trash:            fullState.inventory.trash,
            ore:              fullState.inventory.ore,
            chips:            fullState.inventory.chips,
            plasma:           fullState.inventory.plasma,
            total_mined:      fullState.total_mined,
            nights_survived:  fullState.nights_survived,
            neuro_evolution:  fullState.neuro_evolution,
            neuro_score:      fullState.neuro_score,
            rebel_attacks:    fullState.rebel_attacks_count,
            mining_level:     fullState.upgrades.mining,
            defense_level:    fullState.upgrades.defense_level,
            defense_active:   fullState.upgrades.defense,
            coal_enabled:     fullState.coal_enabled,
            ore_unlocked:     fullState.ore_unlocked,
            completed_quests: [],
            full_state:       fullState,
            game_time:        fullState.game_time,
            is_day:           fullState.is_day,
            last_ai_coal_threshold: fullState.last_ai_coal_threshold,  // ✅ ИСПРАВЛЕНИЕ БАГА 1
            updated_at:       new Date().toISOString(),
        };

        console.log("💾 Сохраняем в облако:", {
            coal:     saveData.coal,
            ore:      saveData.ore,
            nights:   saveData.nights_survived,
            neuro:    saveData.neuro_evolution,
            savedAt:  new Date(fullState._savedAt).toLocaleTimeString(),
            last_ai_coal_threshold: fullState.last_ai_coal_threshold,
        });

        const { error } = await supabase
            .from('game_saves')
            .upsert(saveData, { onConflict: 'user_id' });

        if (error) throw error;

        // ========== ОБНОВЛЕНИЕ ЛИДЕРБОРДА ==========
        const leaderboardUsername = user.user_metadata?.username 
            || user.email?.split('@')[0] 
            || 'Игрок';
        
        console.log("🏆 Обновляем лидерборд для:", leaderboardUsername);
        
        const { error: lbError } = await supabase
            .from('leaderboard')
            .upsert({
                user_id: user.id,
                username: leaderboardUsername,
                total_mined: fullState.total_mined || 0,
                neuro_score: fullState.neuro_score || 0,
                nights: fullState.nights_survived || 0,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        
        if (lbError) {
            console.error("❌ Ошибка обновления лидерборда:", lbError);
        } else {
            console.log("🏆 Лидерборд обновлен успешно");
        }

        console.log("✅ Игра сохранена в облако");
        return { success: true };
        
    } catch (error) {
        console.error("❌ Ошибка сохранения в облако:", error.message);
        return { success: false, error: error.message };
    }
}

// ─────────────────────────────────────────────
// 📥 ЗАГРУЗИТЬ ИГРУ ИЗ ОБЛАКА
// ─────────────────────────────────────────────
export async function loadGameFromCloud() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.warn("Не авторизован - загрузка из облака невозможна");
            return null;
        }

        const { data, error } = await supabase
            .from('game_saves')
            .select('full_state, updated_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error("❌ Ошибка загрузки:", error.message);
            return null;
        }

        if (!data) {
            console.log("Нет сохранений в облаке");
            return null;
        }

        const savedAt = data.full_state?._savedAt;
        if (savedAt) {
            const elapsed = Math.floor((Date.now() - savedAt) / 1000);
            const mins    = Math.floor(elapsed / 60);
            const hours   = Math.floor(mins / 60);
            const timeStr = hours > 0
                ? `${hours}ч ${mins % 60}м`
                : mins > 0
                    ? `${mins}м`
                    : `${elapsed}с`;
            console.log(`✅ Игра загружена из облака | сохранено: ${data.updated_at} | прошло: ${timeStr}`);
        } else {
            console.log("✅ Игра загружена из облака", data.updated_at);
        }

        return data.full_state;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки из облака:", error.message);
        return null;
    }
}

// ─────────────────────────────────────────────
// 🏆 ОБНОВИТЬ ТАБЛИЦУ ЛИДЕРОВ
// ─────────────────────────────────────────────
export async function updateLeaderboard(gameState, username) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('leaderboard')
            .upsert({
                user_id:     user.id,
                username:    username,
                total_mined: gameState.total_mined      || 0,
                neuro_score: gameState.neuro_score      || 0,
                nights:      gameState.nights_survived  || 0,
                updated_at:  new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (error) throw error;
        console.log("🏆 Лидерборд обновлен");
        
    } catch (error) {
        console.error("❌ Ошибка обновления лидерборда:", error.message);
    }
}

// ─────────────────────────────────────────────
// 📊 ПОЛУЧИТЬ ТАБЛИЦУ ЛИДЕРОВ
// ─────────────────────────────────────────────
export async function getLeaderboard(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('username, total_mined, neuro_score, nights')
            .order('total_mined', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
        
    } catch (error) {
        console.error("❌ Ошибка загрузки лидерборда:", error.message);
        return [];
    }
}