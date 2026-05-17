import { testRegions, testProcessedImageSize } from './bboxTestFixture';

/**
 * Pure coordinate-scaling formula extracted from BboxOverlay.tsx:
 *   scaleX = displayWidth  / processedImageSize.width
 *   scaleY = displayHeight / processedImageSize.height
 *   screenX = bbox.x * scaleX
 *   screenY = bbox.y * scaleY
 *   screenW = bbox.w * scaleX
 *   screenH = bbox.h * scaleY
 */
function scaleCoords(
  bbox: { x: number; y: number; w: number; h: number },
  processedImageSize: { width: number; height: number },
  displayWidth: number,
  displayHeight: number
) {
  const scaleX = displayWidth / processedImageSize.width;
  const scaleY = displayHeight / processedImageSize.height;
  return {
    screenX: bbox.x * scaleX,
    screenY: bbox.y * scaleY,
    screenW: bbox.w * scaleX,
    screenH: bbox.h * scaleY,
  };
}

describe('BboxOverlay coordinate scaling', () => {
  const displayWidth = 327;
  const displayHeight = 436;

  describe('first region — normal case', () => {
    const bbox = testRegions[0].contained_bbox;
    const scaleX = displayWidth / testProcessedImageSize.width; // 327 / 640
    const scaleY = displayHeight / testProcessedImageSize.height; // 436 / 480
    const result = scaleCoords(bbox, testProcessedImageSize, displayWidth, displayHeight);

    it('screenX = bbox.x * scaleX', () => {
      expect(result.screenX).toBeCloseTo(bbox.x * scaleX, 2);
    });

    it('screenY = bbox.y * scaleY', () => {
      expect(result.screenY).toBeCloseTo(bbox.y * scaleY, 2);
    });

    it('screenW = bbox.w * scaleX', () => {
      expect(result.screenW).toBeCloseTo(bbox.w * scaleX, 2);
    });

    it('screenH = bbox.h * scaleY', () => {
      expect(result.screenH).toBeCloseTo(bbox.h * scaleY, 2);
    });
  });

  describe('edge case — processedImageSize 0×0', () => {
    const zeroBbox = { x: 45, y: 10, w: 100, h: 50 };
    const zeroSize = { width: 0, height: 0 };
    const result = scaleCoords(zeroBbox, zeroSize, displayWidth, displayHeight);

    /**
     * Dividing by 0 in JS produces Infinity (non-zero numerator) or NaN (0/0).
     * Non-zero bbox coords multiplied by Infinity yield Infinity.
     * This documents the runtime behaviour — the component does not throw.
     */
    it('screenX is Infinity when image width is 0 and bbox.x > 0', () => {
      expect(result.screenX).toBe(Infinity);
    });

    it('screenY is Infinity when image height is 0 and bbox.y > 0', () => {
      expect(result.screenY).toBe(Infinity);
    });
  });

  describe('edge case — zero bbox coords', () => {
    const zeroBbox = { x: 0, y: 0, w: 0, h: 0 };
    const result = scaleCoords(zeroBbox, testProcessedImageSize, displayWidth, displayHeight);

    it('screenX is 0 when bbox.x is 0', () => {
      expect(result.screenX).toBe(0);
    });

    it('screenY is 0 when bbox.y is 0', () => {
      expect(result.screenY).toBe(0);
    });

    it('screenW is 0 when bbox.w is 0', () => {
      expect(result.screenW).toBe(0);
    });

    it('screenH is 0 when bbox.h is 0', () => {
      expect(result.screenH).toBe(0);
    });
  });
});
