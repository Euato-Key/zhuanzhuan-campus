import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { AssistantController } from './assistant.controller';

const router = Router();

router.post('/assistant/chat', authMiddleware, AssistantController.assistantChat);
router.get('/assistant/conversations', authMiddleware, AssistantController.assistantConversations);
router.get('/assistant/conversations/:id/messages', authMiddleware, AssistantController.assistantConversationMessages);
router.delete('/assistant/conversations/:id', authMiddleware, AssistantController.assistantDeleteConversation);

export default router;