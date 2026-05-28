import { ActionSheetIOS } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import PostCard from '@/components/PostCard';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { Post } from '@/types/community';

jest.mock('@/utils/relativeTime', () => ({
  relativeTime: () => '2h',
}));

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({ showActionSheetWithOptions: jest.fn() }),
}));

const ACCENT = '#DB2777';

const post: Post = {
  id: 'p-1',
  channel: 'ch-1',
  author: { id: 'user-alice', display_name: 'Alice', avatar_url: null },
  body: 'Hello world',
  created_at: new Date().toISOString(),
};

function renderCard(props: Partial<React.ComponentProps<typeof PostCard>> = {}) {
  return render(
    <ThemeProvider>
      <PostCard
        post={post}
        currentUserId="user-alice"
        accentColor={ACCENT}
        isAnnouncementsChannel={false}
        onDelete={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('PostCard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders author name, relative time, and body', () => {
    renderCard();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('2h')).toBeTruthy();
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('shows Pinned badge when isAnnouncementsChannel is true', () => {
    renderCard({ isAnnouncementsChannel: true });
    expect(screen.getByText('PINNED')).toBeTruthy();
  });

  it('does not show Pinned badge for regular channels', () => {
    renderCard({ isAnnouncementsChannel: false });
    expect(screen.queryByText('PINNED')).toBeNull();
  });

  it('shows action sheet on long-press when post belongs to current user', () => {
    const sheetSpy = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(jest.fn());
    renderCard({ currentUserId: 'user-alice' });
    fireEvent(screen.getByLabelText('Post by Alice'), 'longPress');
    expect(sheetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: ['Cancel', 'Delete Message'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
      }),
      expect.any(Function),
    );
    sheetSpy.mockRestore();
  });

  it("does not show action sheet on long-press for another user's post", () => {
    const sheetSpy = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(jest.fn());
    renderCard({ currentUserId: 'user-bob' });
    fireEvent(screen.getByLabelText('Post by Alice'), 'longPress');
    expect(sheetSpy).not.toHaveBeenCalled();
    sheetSpy.mockRestore();
  });
});
