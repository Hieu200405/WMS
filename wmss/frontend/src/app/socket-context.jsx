import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth-context';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!user || !token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // Determine Socket URL.
        // If VITE_API_BASE_URL is http://localhost:4001/api/v1, we need http://localhost:4001
        // Parse envBase to determine the correct socket URL.
        // If it sends 'http://localhost:4000/api/v1', we want 'http://localhost:4000'
        // If it sends '/api/v1', we want window.location.origin (to use proxy)
        const envBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
        let serverUrl = envBase;

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            serverUrl = 'http://localhost:4000';
        } else if (serverUrl.startsWith('http')) {
            if (serverUrl.includes('/api/')) {
                serverUrl = serverUrl.split('/api/')[0];
            }
        } else {
            // It's relative, so we use the current origin to go through the proxy
            serverUrl = window.location.origin;
        }

        const newSocket = io(serverUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            // console.log('Socket connected:', newSocket.id);
            newSocket.emit('join_user_room', user.id);
        });

        // Global notification listener
        newSocket.on('notification', (payload) => {
            // payload: { type, title, message }
            switch (payload.type) {
                case 'success': toast.success(payload.message); break;
                case 'error': toast.error(payload.message); break;
                case 'warning': toast(payload.message, { icon: '⚠️' }); break;
                default: toast(payload.message);
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user, token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
