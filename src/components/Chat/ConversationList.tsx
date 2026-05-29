import { useEffect } from 'react';
import { useChatStore } from '../../stores/chat';
import MainLayout from '../Layout/MainLayout';
import ChatView from './ChatView';
import CostDashboard from '../CostDashboard/CostDashboard';
import Settings from '../Settings/Settings';
import MemoryPanel from '../Memory/MemoryPanel';
import MCPPanel from '../MCP/MCPPanel';
import PlayerPanel from '../Player/PlayerPanel';
import VoicePanel from '../Voice/VoicePanel';
import HotspotsPanel from '../Hotspots/HotspotsPanel';
import WeatherCard from '../Weather/WeatherCard';
import PersonaPanel from '../Persona/PersonaPanel';
import SocialPanel from '../Social/SocialPanel';
import HealthPanel from '../Health/HealthPanel';
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
      {view === 'dashboard' ? <CostDashboard /> : view === 'settings' ? <Settings /> : view === 'memory' ? <MemoryPanel /> : view === 'mcp' ? <MCPPanel /> : view === 'player' ? <PlayerPanel /> : view === 'voice' ? <VoicePanel /> : view === 'hotspots' ? <HotspotsPanel /> : view === 'weather' ? <WeatherCard /> : view === 'persona' ? <PersonaPanel /> : view === 'social' ? <SocialPanel /> : view === 'health' ? <HealthPanel /> : <ChatView />}
    </MainLayout>
  );
}
