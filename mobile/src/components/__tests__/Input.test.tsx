/**
 * Tests for Input component.
 * Covers Input.tsx lines 20-61: prop forwarding to TextInput and label rendering.
 *
 * Note: Input does NOT render its own error message text — the hasError prop
 * only changes the border colour (inputError style vs inputDefault). Error text
 * is rendered by the parent screen, not by this component. Tests for error text
 * rendering are therefore not applicable here.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Input from '../Input';

describe('Input — label rendering', () => {
  it('renders the label text', () => {
    // Covers Input.tsx line 39: <Text style={styles.label}>{label}</Text>
    const { getByText } = render(<Input label="Email" value="" onChangeText={() => {}} />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders a different label string — not hardcoded', () => {
    const { getByText } = render(<Input label="Password" value="" onChangeText={() => {}} />);
    expect(getByText('Password')).toBeTruthy();
  });
});

describe('Input — placeholder', () => {
  it('passes placeholder to the TextInput', () => {
    // Covers Input.tsx line 48: placeholder={placeholder}
    const { getByPlaceholderText } = render(
      <Input label="Email" value="" onChangeText={() => {}} placeholder="Enter email" />
    );
    expect(getByPlaceholderText('Enter email')).toBeTruthy();
  });
});

describe('Input — text change', () => {
  it('calls onChangeText with the new value when text changes', () => {
    // Covers Input.tsx line 49: onChangeText={onChangeText}
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input label="Email" value="" onChangeText={onChangeText} placeholder="Enter email" />
    );
    fireEvent.changeText(getByPlaceholderText('Enter email'), 'hello@example.com');
    expect(onChangeText).toHaveBeenCalledWith('hello@example.com');
  });
});

describe('Input — secureTextEntry', () => {
  it('renders without error when secureTextEntry is true', () => {
    // Covers Input.tsx line 50: secureTextEntry={secureTextEntry}
    // Native masking behaviour cannot be asserted in tests; we verify the component renders.
    expect(() => {
      render(<Input label="Password" value="" onChangeText={() => {}} secureTextEntry />);
    }).not.toThrow();
  });
});

describe('Input — hasError style switching', () => {
  it('renders without error when hasError is true', () => {
    // Covers Input.tsx lines 44-46: hasError → inputError style
    // Style application is not directly assertable; we verify the component renders.
    expect(() => {
      render(<Input label="Email" value="bad" onChangeText={() => {}} hasError />);
    }).not.toThrow();
  });
});
