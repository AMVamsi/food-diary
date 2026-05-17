export const typography = {
  screenTitle: { fontSize: 22, fontWeight: '500' as const, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, fontWeight: '400' as const },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  body: { fontSize: 14, fontWeight: '400' as const },
  button: { fontSize: 15, fontWeight: '500' as const, letterSpacing: 0.1 },
  link: { fontSize: 12, fontWeight: '500' as const },
  error: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
} as const;
