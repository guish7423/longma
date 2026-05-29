import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import BottomBar from './BottomBar';

interface Conversation {
  id: number;
  title: string;
}

interface MainLayoutProps {
  children: ReactNode;
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
}

export default function MainLayout({
  children,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: MainLayoutProps) {
  return (
    <div style={styles.container}>
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelect={onSelectConversation}
        onNew={onNewConversation}
        onDelete={onDeleteConversation}
      />
      <div style={styles.main}>
        {children}
      </div>
      <BottomBar />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    background: 'var(--bg-primary)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
};
