// ======== supabase-cloud.js ========
class CloudSaveManager {
    constructor() {
        this.supabase = null;
        this.user = null;
        this.isOnline = false;
        this.isAuthenticated = false;
        console.log('🔄 CloudSaveManager создан');
        this.init();
    }

    async init() {
        try {
            const SUPABASE_URL = 'https://pvweieworrnzjkixowam.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d2VpZXdvcnJuempraXhvd2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjI4MzEsImV4cCI6MjA3ODE5ODgzMX0.ciTGRjOad4u6Wzmg77aka5kNRaHCwYpqe4NSWgasTTY';
            
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            
            // Проверяем существующую сессию
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.user = session.user;
                this.isAuthenticated = true;
                console.log('✅ Пользователь авторизован:', this.user.email);
            }
            
            // Проверяем подключение к базе
            const { error } = await this.supabase
                .from('game_saves')
                .select('player_id')
                .limit(1);
            
            this.isOnline = !error;
            console.log('🌐 Cloud saves:', this.isOnline ? 'ONLINE' : 'OFFLINE');
            
        } catch (error) {
            console.error('❌ Cloud saves: OFFLINE');
            this.isOnline = false;
        }
    }

    // Регистрация
    async register(email, password, username) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username
                    }
                }
            });

            if (error) throw error;
            
            if (data.user) {
                this.user = data.user;
                this.isAuthenticated = true;
                console.log('✅ Регистрация успешна');
                return { success: true, user: data.user };
            }
            
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Вход
    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            
            this.user = data.user;
            this.isAuthenticated = true;
            console.log('✅ Вход успешен');
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Ошибка входа:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Выход
    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
            console.error('❌ Ошибка выхода:', error.message);
            return false;
        }
        
        this.user = null;
        this.isAuthenticated = false;
        console.log('✅ Выход выполнен');
        return true;
    }

    // Обновленные методы сохранения/загрузки с привязкой к пользователю
    async saveGame(saveData) {
        if (!this.isOnline || !this.isAuthenticated) {
            console.log('📡 Cloud save skipped:', !this.isOnline ? 'offline' : 'not authenticated');
            return false;
        }

        try {
            const { error } = await this.supabase
                .from('game_saves')
                .upsert({
                    player_id: this.user.id, // Используем ID пользователя
                    save_data: JSON.stringify(saveData),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log('✅ Cloud save successful');
            return true;
        } catch (error) {
            console.error('❌ Cloud save failed:', error);
            return false;
        }
    }

    async loadGame() {
        if (!this.isOnline || !this.isAuthenticated) return null;

        try {
            const { data, error } = await this.supabase
                .from('game_saves')
                .select('save_data')
                .eq('player_id', this.user.id) // Ищем по user_id
                .single();

            if (error) throw error;
            console.log('✅ Cloud load successful');
            return JSON.parse(data.save_data);
        } catch (error) {
            console.error('❌ Cloud load failed:', error);
            return null;
        }
    }

    // Получение информации о пользователе
    getUserInfo() {
        return this.user ? {
            email: this.user.email,
            username: this.user.user_metadata?.username,
            id: this.user.id
        } : null;
    }

    // Проверка статуса аутентификации
    getAuthStatus() {
        return {
            isOnline: this.isOnline,
            isAuthenticated: this.isAuthenticated,
            user: this.getUserInfo()
        };
    }
}

// Создаем глобальную переменную
window.cloudSaveManager = new CloudSaveManager();