import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import PostCard from '@/components/PostCard';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { Post } from '@/types/community';

jest.mock('@/utils/relativeTime', () => ({
  relativeTime: () => '2h',
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

  it('shows delete alert on long-press when post belongs to current user', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderCard({ currentUserId: 'user-alice' });
    fireEvent(screen.getByLabelText('Post by Alice'), 'longPress');
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete post?',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it("does not show delete alert on long-press for another user's post", () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderCard({ currentUserId: 'user-bob' });
    fireEvent(screen.getByLabelText('Post by Alice'), 'longPress');
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
