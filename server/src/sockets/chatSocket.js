/**
 * Socket.io Real-Time Engine for WhatsApp CRM
 * Manages active agent connections, regional channel rooms, and typing notifications
 */
export function setupSocketEvents(io) {
  io.on('connection', (socket) => {
    // console.log(`Client connected: ${socket.id}`);

    // Join specific regional channel room (e.g. "channel_dubai", "channel_saudi")
    socket.on('channel:join', ({ channelId }) => {
      if (channelId) {
        socket.join(`channel:${channelId}`);
        // console.log(`Socket ${socket.id} joined room channel:${channelId}`);
      }
    });

    socket.on('channel:leave', ({ channelId }) => {
      if (channelId) {
        socket.leave(`channel:${channelId}`);
      }
    });

    // Join specific active lead chat room
    socket.on('lead:join', ({ leadId }) => {
      if (leadId) {
        socket.join(`lead:${leadId}`);
      }
    });

    socket.on('lead:leave', ({ leadId }) => {
      if (leadId) {
        socket.leave(`lead:${leadId}`);
      }
    });

    // Typing notification
    socket.on('typing:start', ({ leadId, agentName }) => {
      socket.to(`lead:${leadId}`).emit('typing:status', { leadId, agentName, isTyping: true });
    });

    socket.on('typing:stop', ({ leadId }) => {
      socket.to(`lead:${leadId}`).emit('typing:status', { leadId, isTyping: false });
    });

    socket.on('disconnect', () => {
      // Clean up on disconnect
    });
  });
}
