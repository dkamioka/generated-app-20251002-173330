import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '@/components/ChatPanel';
import { useGameStore } from '@/store/gameStore';
import type { ChatMessage } from '@shared/types';

vi.mock('@/store/gameStore');
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 minutes ago',
}));

describe('ChatPanel Component', () => {
  const mockSendMessage = vi.fn();
  const mockTogglePlayerChatVisibility = vi.fn();

  const defaultStoreState = {
    myPlayerId: 'player-1',
    myObserverId: null,
    players: [
      { id: 'player-1', name: 'Alice', color: 'black' as const },
      { id: 'player-2', name: 'Bob', color: 'white' as const },
    ],
    observers: [],
    playerChat: [] as ChatMessage[],
    publicChat: [] as ChatMessage[],
    isPlayerChatVisible: true,
    sendMessage: mockSendMessage,
    togglePlayerChatVisibility: mockTogglePlayerChatVisibility,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as any).mockImplementation((selector: any) =>
      selector(defaultStoreState)
    );
  });

  it('should render chat panel title', () => {
    render(<ChatPanel />);
    expect(screen.getByText('COMMS-LINK')).toBeInTheDocument();
  });

  it('should render public and player tabs', () => {
    render(<ChatPanel />);
    expect(screen.getByRole('tab', { name: /public/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /players/i })).toBeInTheDocument();
  });

  it('should disable player tab for observers', () => {
    const store = {
      ...defaultStoreState,
      myPlayerId: null,
      myObserverId: 'observer-1',
      observers: [{ id: 'observer-1', name: 'Observer' }],
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);
    const playerTab = screen.getByRole('tab', { name: /players/i });
    expect(playerTab).toBeDisabled();
  });

  it('should display public chat messages', () => {
    const publicChat: ChatMessage[] = [
      {
        senderId: 'player-1',
        senderName: 'Alice',
        message: 'Hello everyone!',
        timestamp: new Date().toISOString(),
      },
      {
        senderId: 'player-2',
        senderName: 'Bob',
        message: 'Good game!',
        timestamp: new Date().toISOString(),
      },
    ];

    const store = { ...defaultStoreState, publicChat };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('Good game!')).toBeInTheDocument();
  });

  it('should display player chat messages', () => {
    const playerChat: ChatMessage[] = [
      {
        senderId: 'player-1',
        senderName: 'Alice',
        message: 'Nice move!',
        timestamp: new Date().toISOString(),
      },
    ];

    const store = { ...defaultStoreState, playerChat };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);

    // Switch to player tab
    const playerTab = screen.getByRole('tab', { name: /players/i });
    fireEvent.click(playerTab);

    expect(screen.getByText('Nice move!')).toBeInTheDocument();
  });

  it('should send public message when form submitted', () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/type message/i);
    const sendButton = screen.getByRole('button', { name: '' }); // Send button has no text

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockSendMessage).toHaveBeenCalledWith('Test message', 'public');
  });

  it('should send player message when on player tab', () => {
    render(<ChatPanel />);

    // Switch to player tab
    const playerTab = screen.getByRole('tab', { name: /players/i });
    fireEvent.click(playerTab);

    const input = screen.getByPlaceholderText(/type message/i);
    fireEvent.change(input, { target: { value: 'Player message' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockSendMessage).toHaveBeenCalledWith('Player message', 'player');
  });

  it('should clear input after sending message', () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/type message/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.submit(input.closest('form')!);

    expect(input.value).toBe('');
  });

  it('should not send empty messages', () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/type message/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should display "No messages yet" when chat is empty', () => {
    render(<ChatPanel />);
    expect(screen.getByText('No messages yet.')).toBeInTheDocument();
  });

  it('should show visibility toggle for players', () => {
    render(<ChatPanel />);
    expect(screen.getByText(/Player Chat Visible to Observers/i)).toBeInTheDocument();
  });

  it('should not show visibility toggle for observers', () => {
    const store = {
      ...defaultStoreState,
      myPlayerId: null,
      myObserverId: 'observer-1',
      observers: [{ id: 'observer-1', name: 'Observer' }],
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);
    expect(screen.queryByText(/Player Chat Visible to Observers/i)).not.toBeInTheDocument();
  });

  it('should toggle chat visibility when switch is clicked', () => {
    render(<ChatPanel />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(mockTogglePlayerChatVisibility).toHaveBeenCalled();
  });

  it('should disable input for non-authenticated users', () => {
    const store = {
      ...defaultStoreState,
      myPlayerId: null,
      myObserverId: null,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/log in to chat/i);
    expect(input).toBeDisabled();
  });

  it('should limit message length to 100 characters', () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/type message/i) as HTMLInputElement;
    expect(input.maxLength).toBe(100);
  });

  it('should color player names by their stone color', () => {
    const publicChat: ChatMessage[] = [
      {
        senderId: 'player-1',
        senderName: 'Alice',
        message: 'Black player message',
        timestamp: new Date().toISOString(),
      },
      {
        senderId: 'player-2',
        senderName: 'Bob',
        message: 'White player message',
        timestamp: new Date().toISOString(),
      },
    ];

    const store = { ...defaultStoreState, publicChat };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<ChatPanel />);

    const aliceName = screen.getByText('Alice:');
    const bobName = screen.getByText('Bob:');

    expect(aliceName.className).toContain('text-neon-magenta'); // Black player
    expect(bobName.className).toContain('text-neon-cyan'); // White player
  });

  it('should color observer names differently', () => {
    const publicChat: ChatMessage[] = [
      {
        senderId: 'observer-1',
        senderName: 'Observer',
        message: 'Observer message',
        timestamp: new Date().toISOString(),
      },
    ];

    const store = {
      ...defaultStoreState,
      publicChat,
      observers: [{ id: 'observer-1', name: 'Observer' }],
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<ChatPanel />);

    const observerName = screen.getByText('Observer:');
    expect(observerName.className).toContain('text-neon-green');
  });

  it('should display timestamps for messages', () => {
    const publicChat: ChatMessage[] = [
      {
        senderId: 'player-1',
        senderName: 'Alice',
        message: 'Test',
        timestamp: new Date().toISOString(),
      },
    ];

    const store = { ...defaultStoreState, publicChat };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('should allow observers to send public chat only', () => {
    const store = {
      ...defaultStoreState,
      myPlayerId: null,
      myObserverId: 'observer-1',
      observers: [{ id: 'observer-1', name: 'Observer' }],
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/type public message/i);
    expect(input).not.toBeDisabled();
  });
});
