import { useState, useCallback } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  plan: string;
  joinDate: string;
}

interface StoredUser {
  email: string;
  password: string;
  name: string;
  plan: string;
  joinDate: string;
}

const SESSION_KEY = 'stockai_auth';
const USERS_KEY   = 'registered_users';

const SEED: StoredUser = {
  email:     'yan_shao@ncnu.edu.tw',
  password:  'stockai2024',
  name:      '邵彥',
  plan:      'FinPulse Pro · NT$899/月',
  joinDate:  '2024 年 1 月',
};

function loadUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);

  // Nothing stored yet — first launch only
  if (raw === null) {
    localStorage.setItem(USERS_KEY, JSON.stringify([SEED]));
    return [SEED];
  }

  // Data exists — parse carefully, never wipe with just seed
  let users: StoredUser[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) users = parsed;
  } catch { /* malformed JSON — treat as empty, will re-add seed below */ }

  // Guarantee seed account is always present
  if (!users.find(u => u.email === SEED.email)) {
    users.unshift(SEED);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  return users;
}

function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function nowJoinDate(): string {
  const d = new Date();
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadSession);

  const login = useCallback((email: string, password: string): string | null => {
    if (!email.trim()) return '請輸入電子郵件';
    if (!password)     return '請輸入密碼';
    const users = loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.password !== password) return '帳號或密碼錯誤';
    const session: AuthUser = { email: found.email, name: found.name, plan: found.plan, joinDate: found.joinDate };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return null;
  }, []);

  const register = useCallback((email: string, password: string, name: string): string | null => {
    if (!name.trim())    return '請輸入姓名';
    if (!email.trim())   return '請輸入電子郵件';
    if (!password)       return '請輸入密碼';
    if (password.length < 6) return '密碼至少需要 6 個字元';
    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())) return '該 Email 已被註冊';
    const newUser: StoredUser = {
      email:    email.trim().toLowerCase(),
      password,
      name:     name.trim(),
      plan:     'FinPulse 免費版',
      joinDate: nowJoinDate(),
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return null;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return { user, login, register, logout };
}
