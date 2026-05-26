import { fireEvent, render, screen } from '@testing-library/react-native';

import FilterChips from '@/components/FilterChips';
import { ThemeProvider } from '@/theme/ThemeContext';

function renderWithTheme(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe('FilterChips', () => {
  const items = [
    { value: 'all', label: 'All' },
    { value: 'study', label: 'Study' },
    { value: 'gaming', label: 'Gaming' },
  ];

  it('renders every chip label', () => {
    renderWithTheme(<FilterChips items={items} active="all" onChange={() => {}} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Study')).toBeTruthy();
    expect(screen.getByText('Gaming')).toBeTruthy();
  });

  it('marks the active chip as selected', () => {
    renderWithTheme(<FilterChips items={items} active="gaming" onChange={() => {}} />);
    const active = screen.getByRole('tab', { name: 'Gaming' });
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    const inactive = screen.getByRole('tab', { name: 'All' });
    expect(inactive.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('calls onChange with the chip value when pressed', () => {
    const onChange = jest.fn();
    renderWithTheme(<FilterChips items={items} active="all" onChange={onChange} />);
    fireEvent.press(screen.getByRole('tab', { name: 'Study' }));
    expect(onChange).toHaveBeenCalledWith('study');
  });
});
