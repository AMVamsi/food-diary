import { useState } from 'react';

export interface AuthFormState {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export function useAuthForm() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): ValidationResult => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail.includes('@') || trimmedEmail.length === 0) {
      return {
        isValid: false,
        error: 'Please enter a valid email address',
      };
    }

    if (password.length < 6) {
      return {
        isValid: false,
        error: 'Password must be at least 6 characters',
      };
    }

    return { isValid: true, error: null };
  };

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    togglePasswordVisibility,
    isLoading,
    setIsLoading,
    error,
    setError,
    validateForm,
  };
}
