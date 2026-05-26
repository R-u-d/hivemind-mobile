import { fireEvent, render, screen } from '@testing-library/react-native';

import CommunityCard from '@/components/CommunityCard';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';

const base: Community = {
  id: 'c1',
  name: 'Brooklyn Linocut Club',
  type: 'creative',
  member_count: 412,
  created_at: '2026-01-01T00:00:00Z',
  is_member: false,
  cover_image_url: null,
  is_private: false,
};

function renderCard(props: Partial<React.ComponentProps<typeof CommunityCard>> = {}) {
  return render(
    <ThemeProvider>
      <CommunityCard
        community={base}
        onPress={() => {}}
        onJoinPress={() => {}}
        onLeavePress={() => {}}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('CommunityCard', () => {
  it('renders the community name and member count', () => {
    renderCard();
    expect(screen.getByText('Brooklyn Linocut Club')).toBeTruthy();
    expect(screen.getByText('412 members')).toBeTruthy();
  });

  it('renders a Join button when not a member', () => {
    renderCard();
    expect(screen.getByLabelText('Join Brooklyn Linocut Club')).toBeTruthy();
  });

  it('renders a Joined button when a member', () => {
    renderCard({ community: { ...base, is_member: true } });
    expect(screen.getByLabelText('Leave Brooklyn Linocut Club')).toBeTruthy();
  });

  it('calls onJoinPress with the community id when Join is pressed', () => {
    const onJoinPress = jest.fn();
    renderCard({ onJoinPress });
    fireEvent.press(screen.getByLabelText('Join Brooklyn Linocut Club'));
    expect(onJoinPress).toHaveBeenCalledWith('c1');
  });

  it('calls onLeavePress with the community id when Joined is pressed', () => {
    const onLeavePress = jest.fn();
    renderCard({ community: { ...base, is_member: true }, onLeavePress });
    fireEvent.press(screen.getByLabelText('Leave Brooklyn Linocut Club'));
    expect(onLeavePress).toHaveBeenCalledWith('c1');
  });
});
