import { colors } from '../colors';
import { spacing } from '../spacing';
import { typography } from '../typography';

describe('theme constants', () => {
  describe('colors', () => {
    it('bmiNormal is green', () => {
      expect(colors.bmiNormal).toBe('#4ade80');
    });

    it('bmiUnderweight is blue', () => {
      expect(colors.bmiUnderweight).toBe('#60a5fa');
    });

    it('bmiOverweight is amber', () => {
      expect(colors.bmiOverweight).toBe('#fbbf24');
    });

    it('bmiObese is red', () => {
      expect(colors.bmiObese).toBe('#f87171');
    });
  });

  describe('spacing', () => {
    it('xs is 4', () => {
      expect(spacing.xs).toBe(4);
    });

    it('sm is 8', () => {
      expect(spacing.sm).toBe(8);
    });

    it('lg is 16', () => {
      expect(spacing.lg).toBe(16);
    });
  });

  describe('typography', () => {
    it('exports a typography object', () => {
      expect(typeof typography).toBe('object');
    });
  });
});
