/**
 * Regional Multi-Tenant Channel Access Guard
 * Enforces that Dubai agents only access Dubai leads, Saudi agents only access Saudi leads, etc.
 */
export function requireChannelAccess(getChannelIdFromReq) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super Admin has global visibility across all regional channels
    if (user.role === 'ADMIN') {
      return next();
    }

    // Extract target channelId from request (param, body, or query)
    const channelId = getChannelIdFromReq ? getChannelIdFromReq(req) : (req.params.channelId || req.body.channelId || req.query.channelId);

    if (!channelId || channelId === 'all') {
      // If agent tries to view "all", they are only allowed if they have ADMIN privileges
      return res.status(403).json({ 
        error: 'Access denied: Agents cannot access consolidated view. Select your assigned regional channel.' 
      });
    }

    if (!user.allowedChannelIds.includes(channelId)) {
      return res.status(403).json({ 
        error: 'Access denied: You are not authorized to view or manage this regional WhatsApp channel.' 
      });
    }

    next();
  };
}
