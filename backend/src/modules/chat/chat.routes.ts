import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();
router.use(authMiddleware);

// Conversations
router.get('/conversations', ChatController.listConversations);
router.post('/conversations', ChatController.createConversation);
router.get('/conversations/:id', ChatController.getConversation);

// Messages
router.get('/conversations/:id/messages', ChatController.listMessages);
router.post('/conversations/:id/messages', ChatController.sendMessage);
router.put('/conversations/:id/messages/read', ChatController.markAsRead);
router.get('/conversations/:id/messages/search', ChatController.searchMessages);

// Blacklist
router.get('/blacklist', ChatController.listBlacklist);
router.post('/blacklist', ChatController.blockUser);
router.delete('/blacklist/:blockedUserId', ChatController.unblockUser);
router.get('/blacklist/check', ChatController.checkBlockStatus);

// Quick replies
router.get('/quick-replies', ChatController.listQuickReplies);
router.post('/quick-replies', ChatController.createQuickReply);
router.put('/quick-replies/sort', ChatController.batchUpdateSort);
router.put('/quick-replies/:id', ChatController.updateQuickReply);
router.delete('/quick-replies/:id', ChatController.deleteQuickReply);

// Bargain template
router.get('/bargain-template/:productId', ChatController.getBargainTemplate);

export default router;