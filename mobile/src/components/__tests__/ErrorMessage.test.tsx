/**
 * Tests for ErrorMessage component.
 * Covers ErrorMessage.tsx lines 11-18: conditional render based on message prop.
 * The component returns null for falsy messages and renders Text for truthy ones.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorMessage from '../ErrorMessage';

// Covers ErrorMessage.tsx line 12: if (!message) return null
describe('ErrorMessage — falsy message renders nothing', () => {
  it('renders nothing when message is null', () => {
    const { toJSON } = render(<ErrorMessage message={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when message is empty string', () => {
    const { toJSON } = render(<ErrorMessage message="" />);
    expect(toJSON()).toBeNull();
  });
});

// Covers ErrorMessage.tsx lines 14-18: View + Text rendered when message is truthy
describe('ErrorMessage — truthy message renders text', () => {
  it('renders the message string when provided', () => {
    const { getByText } = render(<ErrorMessage message="Something went wrong" />);
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders a different message string — not a hardcoded value', () => {
    const { getByText } = render(<ErrorMessage message="Invalid credentials" />);
    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('does not render previous message after prop changes to null', () => {
    const { rerender, toJSON } = render(<ErrorMessage message="First error" />);
    rerender(<ErrorMessage message={null} />);
    expect(toJSON()).toBeNull();
  });
});
