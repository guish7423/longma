import { useEffect } from 'react';
import { useChatStore } from '../../stores/chat';
import MainLayout from '../Layout/MainLayout';
import ChatView from './ChatView';
import CostDashboard from '../CostDashboard/CostDashboard';
import Settings from '../Settings/Settings';
import { useSessionStore } from '../../stores/session';

export default function ConversationList() {
  const {
    conversations,
    currentConversationId,
    selectConversation,
    newConversation,
    deleteConversation,
    loadConversations,
  } = useChatStore();
  const { view } = useSessionStore();

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <MainLayout
      conversations={conversations}
      currentConversationId={currentConversationId}
      onSelectConversation={selectConversation}
      onNewConversation={newConversation}
      onDeleteConversation={deleteConversation}
    >
      {view === 'dashboard' ? <CostDashboard /> : view === 'settings' ? <Settings /> : <ChatView />}
    </MainLayout>
  );
}
