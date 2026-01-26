const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

const activeUsers = new Map();
const userSessions = new Map();
const conversations = new Map();

io.on('connection', (socket) => {
    console.log('🔌 New connection:', socket.id);

    socket.on('user-join', (userData) => {
        const { userId, userName } = userData;
        console.log(`👤 User joined: ${userName} (${userId})`);

        userSessions.set(socket.id, {
            userId,
            userName,
            joinedAt: new Date(),
            isAdmin: false
        });

        activeUsers.set(userId, socket.id);

        if (!conversations.has(userId)) {
            conversations.set(userId, []);
            conversations.get(userId).push({
                id: 'welcome_' + Date.now(),
                sender: 'bot',
                content: 'Hello! Welcome to Tekagon Support. How can I help you today?',
                timestamp: new Date().toISOString(),
                read: true
            });
        }

        socket.emit('load-messages', conversations.get(userId));

        // Notify admin
        const adminSockets = Array.from(userSessions.entries())
            .filter(([_, session]) => session.isAdmin)
            .map(([socketId]) => socketId);

        adminSockets.forEach(adminSocketId => {
            io.to(adminSocketId).emit('user-joined', {
                userId,
                userName,
                joinedAt: new Date().toISOString(),
                messageCount: conversations.get(userId).length
            });
        });
    });

    socket.on('admin-join', () => {
        console.log('🛡️ Admin joined:', socket.id);
        userSessions.set(socket.id, {
            userId: 'admin',
            userName: 'Admin',
            joinedAt: new Date(),
            isAdmin: true
        });

        const activeUsersList = Array.from(userSessions.entries())
            .filter(([_, data]) => !data.isAdmin)
            .map(([socketId, data]) => ({
                socketId,
                userId: data.userId,
                userName: data.userName,
                joinedAt: data.joinedAt,
                messageCount: conversations.get(data.userId)?.length || 0
            }));

        socket.emit('admin-data', {
            activeUsers: activeUsersList,
            totalConversations: conversations.size
        });
    });

    socket.on('user-message', (data) => {
        const { userId, message } = data;
        const userSession = userSessions.get(socket.id);

        if (!userSession || userSession.userId !== userId) {
            socket.emit('error', 'Invalid user session');
            return;
        }

        console.log(`💬 ${userSession.userName} sent: ${message.content.substring(0, 50)}...`);

        if (!conversations.has(userId)) {
            conversations.set(userId, []);
        }

        conversations.get(userId).push({
            ...message,
            delivered: true
        });

        socket.emit('message-delivered', message.id);

        // Notify admin
        const adminSockets = Array.from(userSessions.entries())
            .filter(([_, session]) => session.isAdmin)
            .map(([socketId]) => socketId);

        adminSockets.forEach(adminSocketId => {
            io.to(adminSocketId).emit('new-user-message', {
                userId,
                userName: userSession.userName,
                message: {
                    ...message,
                    delivered: true
                },
                timestamp: new Date().toISOString()
            });
        });
    });

    // In your server.js, update the admin-message handler:
    socket.on('admin-message', (data) => {
        const { userId, message } = data;
        const adminSession = userSessions.get(socket.id);

        if (!adminSession || !adminSession.isAdmin) {
            socket.emit('error', 'Admin only');
            return;
        }

        console.log(`🛡️ Admin to ${userId}: ${message.content.substring(0, 50)}...`);

        if (!conversations.has(userId)) {
            conversations.set(userId, []);
        }

        conversations.get(userId).push(message);

        // Send to user
        const userSocketId = activeUsers.get(userId);
        if (userSocketId) {
            io.to(userSocketId).emit('new-admin-message', message);
        }

        // Also send confirmation back to admin
        socket.emit('admin-message-sent', {
            userId,
            message: message
        });

        // Simulate typing indicator
        if (userSocketId) {
            setTimeout(() => {
                io.to(userSocketId).emit('admin-typing', { userId });

                setTimeout(() => {
                    io.to(userSocketId).emit('admin-stopped-typing', { userId });
                }, 1000);
            }, 500);
        }
    });

    // Add admin-read-messages handler:
    socket.on('admin-read-messages', (data) => {
        const { userId, messageIds } = data;
        const adminSession = userSessions.get(socket.id);

        if (!adminSession || !adminSession.isAdmin) {
            return;
        }

        console.log(`🛡️ Admin marked messages from ${userId} as read`);

        if (conversations.has(userId)) {
            conversations.get(userId).forEach(msg => {
                if (messageIds.includes(msg.id) && msg.sender === 'user') {
                    msg.read = true;
                }
            });
        }


        // Notify admin
        const adminSockets = Array.from(userSessions.entries())
            .filter(([_, session]) => session.isAdmin)
            .map(([socketId]) => socketId);

        adminSockets.forEach(adminSocketId => {
            io.to(adminSocketId).emit('user-read-messages', {
                userId,
                userName: userSession.userName,
                messageIds,
                timestamp: new Date().toISOString()
            });
        });
    });

    socket.on('update-user', (data) => {
        const { userId, userName } = data;
        const userSession = userSessions.get(socket.id);

        if (userSession && userSession.userId === userId) {
            userSession.userName = userName;
            console.log(`📝 ${userId} updated name to ${userName}`);
        }
    });
    const userSocketId = activeUsers.get(userId);
    if (userSocketId) {
        io.to(userSocketId).emit('messages-read', { messageIds });
    }


    socket.on('ping', () => {
        socket.emit('pong');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected:', socket.id);
        const session = userSessions.get(socket.id);

        if (session) {
            userSessions.delete(socket.id);
            if (!session.isAdmin) {
                activeUsers.delete(session.userId);

                // Notify admin
                const adminSockets = Array.from(userSessions.entries())
                    .filter(([_, session]) => session.isAdmin)
                    .map(([socketId]) => socketId);

                adminSockets.forEach(adminSocketId => {
                    io.to(adminSocketId).emit('user-left', {
                        userId: session.userId,
                        userName: session.userName,
                        leftAt: new Date().toISOString()
                    });
                });
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Chat server running on port ${PORT}`);
    console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);
});