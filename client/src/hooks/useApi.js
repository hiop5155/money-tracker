import { useState, useCallback } from 'react';
import { API_URL } from '../config';

export const useApi = (token, onLogout) => {
    const [isApiLoading, setIsApiLoading] = useState(false);
    const execute = useCallback(
        async (endpoint, options = {}) => {
            setIsApiLoading(true);

            // wait at least 500ms to show loading overlay
            const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 500));
            const request = async () => {
                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...options.headers,
                };
                try {
                    const res = await fetch(`${API_URL}${endpoint}`, {
                        ...options,
                        headers,
                    });
                    if (res.status === 401) {
                        if (onLogout) onLogout();
                        throw new Error('Unauthorized');
                    }
                    return res;
                } catch (error) {
                    throw error;
                }
            };

            try {
                const [res] = await Promise.all([request(), minLoadingTime]);
                return res;
            } catch (error) {
                throw error;
            } finally {
                setIsApiLoading(false);
            }
        },
        [token, onLogout]
    );

    return { isApiLoading, execute };
};
