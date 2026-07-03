import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// localStorage stores ONLY non-sensitive display fields: { email, name, phone }
// The following are kept in React state ONLY (never written to localStorage):
//   idToken  — short-lived Google ID JWT sent in every authenticated API call
//   isAdmin  — derived from server on login; never persisted or trusted from storage
// On reload the user sees their name/email from localStorage immediately,
// but Google One-Tap re-authenticates them silently before any auth action.

export const UserProvider = ({ children }) => {
    const [user, setUserState] = useState(() => {
        // Migrate legacy key name
        const oldAuth = localStorage.getItem('googleAuthUser');
        if (oldAuth) {
            try {
                const parsed = JSON.parse(oldAuth);
                const migrated = { email: parsed.email, name: parsed.name, phone: '' };
                localStorage.setItem('user', JSON.stringify(migrated));
                localStorage.removeItem('googleAuthUser');
                return migrated;
            } catch { /* ignore */ }
        }

        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (!parsed.email) {
                    localStorage.removeItem('user');
                    return null;
                }
                // Restore ONLY safe display fields — never idToken/isAdmin
                return { email: parsed.email, name: parsed.name || '', phone: parsed.phone || '' };
            } catch { /* ignore */ }
        }
        return null;
    });

    useEffect(() => {
        if (user) {
            // Persist ONLY non-sensitive display fields
            localStorage.setItem('user', JSON.stringify({
                email: user.email  || '',
                name:  user.name   || '',
                phone: user.phone  || '',
            }));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    // Merge updates so callers can do setUser({ phone: '...' }) without losing other fields
    const setUser = (value) => {
        setUserState(prev => {
            if (value === null) return null;
            if (typeof value === 'function') return value(prev);
            return { ...prev, ...value };
        });
    };

    const logout = () => setUserState(null);

    return (
        <UserContext.Provider value={{ user, setUser, logout }}>
            {children}
        </UserContext.Provider>
    );
};
