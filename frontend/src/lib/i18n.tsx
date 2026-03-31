"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "ru" | "en";

const translations: Record<Lang, Record<string, string>> = {
  ru: {
    // Navigation
    "nav.home": "Главная",
    "nav.radar": "Радар",
    "nav.focus": "Фокус",
    "nav.chat": "Чат",
    "nav.profile": "Профиль",
    // Settings
    "settings.title": "Настройки",
    "settings.account": "Аккаунт",
    "settings.language": "Язык",
    "settings.notifications": "Уведомления",
    "settings.about": "О приложении",
    "settings.logout": "Выйти",
    "settings.version": "Версия",
    "settings.privacy": "Политика конфиденциальности",
    // Chat
    "chat.message": "Сообщение...",
    "chat.noMessages": "Нет сообщений",
    "chat.startConversation": "Начните разговор",
    "chat.today": "Сегодня",
    "chat.yesterday": "Вчера",
    "chat.online": "онлайн",
    "chat.lastSeen": "был(а) {time} назад",
    "chat.sent": "отправлено",
    "chat.delivered": "доставлено",
    "chat.read": "прочитано",
    "chat.sendImage": "Отправить фото",
    // Connections
    "connections.title": "Контакты",
    "connections.connected": "Подключения",
    "connections.pending": "Ожидают",
    "connections.noConnections": "Нет подключений",
    "connections.noPending": "Нет ожидающих запросов",
    "connections.accept": "Принять",
    "connections.reject": "Отклонить",
    "connections.openRadar": "Открыть радар",
    "connections.wantsToConnect": "хочет связаться",
    // Radar
    "radar.title": "Радар",
    "radar.connect": "Связаться",
    "radar.connected": "Связаны",
    "radar.pending": "Ожидание",
    "radar.message": "Написать",
    // Feed
    "feed.title": "Подобрано для вас",
    "feed.basedOn": "На основе:",
    "feed.noPosts": "Нет постов",
    "feed.setGoal": "Установите цель для персонализации",
    "feed.impacted": "Воздействовал",
    "feed.giveImpact": "Дать Impact",
    // Common
    "common.loading": "Загрузка...",
    "common.error": "Ошибка",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.search": "Поиск",
    "common.send": "Отправить",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.radar": "Radar",
    "nav.focus": "Focus",
    "nav.chat": "Chat",
    "nav.profile": "Profile",
    // Settings
    "settings.title": "Settings",
    "settings.account": "Account",
    "settings.language": "Language",
    "settings.notifications": "Notifications",
    "settings.about": "About",
    "settings.logout": "Log Out",
    "settings.version": "Version",
    "settings.privacy": "Privacy Policy",
    // Chat
    "chat.message": "Message...",
    "chat.noMessages": "No messages yet",
    "chat.startConversation": "Send a message to start the conversation",
    "chat.today": "Today",
    "chat.yesterday": "Yesterday",
    "chat.online": "online",
    "chat.lastSeen": "last seen {time} ago",
    "chat.sent": "sent",
    "chat.delivered": "delivered",
    "chat.read": "read",
    "chat.sendImage": "Send image",
    // Connections
    "connections.title": "Connections",
    "connections.connected": "Connected",
    "connections.pending": "Pending",
    "connections.noConnections": "No connections yet",
    "connections.noPending": "No pending requests",
    "connections.accept": "Accept",
    "connections.reject": "Reject",
    "connections.openRadar": "Open Radar",
    "connections.wantsToConnect": "wants to connect",
    // Radar
    "radar.title": "Radar",
    "radar.connect": "Connect",
    "radar.connected": "Connected",
    "radar.pending": "Pending",
    "radar.message": "Message",
    // Feed
    "feed.title": "Curated For You",
    "feed.basedOn": "Based on:",
    "feed.noPosts": "No posts yet",
    "feed.setGoal": "Set your goal to get personalized content",
    "feed.impacted": "Impacted",
    "feed.giveImpact": "Give Impact",
    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.search": "Search",
    "common.send": "Send",
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("app_lang") as Lang;
    if (saved && (saved === "ru" || saved === "en")) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("app_lang", newLang);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let text = translations[lang]?.[key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
