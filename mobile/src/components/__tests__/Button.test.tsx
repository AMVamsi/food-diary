/**
 * Tests for Button component.
 * Covers Button.tsx lines 16-73: primary and ghost variant rendering,
 * onPress delegation, disabled/loading state (isInactive flag lines 23-24).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import Button from '../Button';

describe('Button — primary variant rendering', () => {
  it('renders the title text', () => {
    // Covers Button.tsx line 69: Text with title in primary variant
    const { getByText } = render(<Button title="Save" onPress={() => {}} />);
    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    // Covers Button.tsx line 57: onPress prop forwarded to TouchableOpacity
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled is true', () => {
    // Covers Button.tsx lines 23-24: isInactive = disabled || loading → disabled prop
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} disabled />);
    fireEvent.press(getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Button — loading state', () => {
  it('shows ActivityIndicator instead of title text when loading is true', () => {
    // Covers Button.tsx lines 66-68: loading → ActivityIndicator, no Text
    const { queryByText, UNSAFE_queryByType } = render(
      <Button title="Save" onPress={() => {}} loading />
    );
    expect(queryByText('Save')).toBeNull();
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it('sets disabled={true} on the touchable when loading is true', () => {
    // Covers Button.tsx lines 23-24: isInactive = disabled || loading
    // loading=true → isInactive=true → disabled prop forwarded to TouchableOpacity
    const { UNSAFE_getByType } = render(<Button title="Save" onPress={() => {}} loading />);
    const touchable = UNSAFE_getByType(TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });
});

describe('Button — ghost variant', () => {
  it('renders without throwing when variant is ghost', () => {
    // Covers Button.tsx lines 25-51: ghost branch renders correctly
    expect(() => {
      render(<Button title="Skip" onPress={() => {}} variant="ghost" />);
    }).not.toThrow();
  });

  it('renders the title text in ghost variant', () => {
    // Ghost variant also shows the title (via MaskedView + Text)
    const { getAllByText } = render(<Button title="Skip" onPress={() => {}} variant="ghost" />);
    // Ghost renders the text twice (mask element + hidden duplicate for sizing)
    const matches = getAllByText('Skip');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
