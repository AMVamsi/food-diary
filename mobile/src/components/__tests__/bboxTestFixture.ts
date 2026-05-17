export const testImageUri = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800';
// Pizza image — publicly accessible, no auth required

export const testProcessedImageSize = { width: 640, height: 480 };

export const testRegions = [
  {
    // Region 1: large box near top — exercises tier 2 (label inside box)
    contained_bbox: { x: 45, y: 10, w: 550, h: 420 },
    recognition_results: [
      { name: 'Margherita pizza', prob: 0.91 },
      { name: 'Pizza', prob: 0.85 },
    ],
  },
  {
    // Region 2: small box in lower left — exercises tier 1 (label above)
    contained_bbox: { x: 60, y: 340, w: 160, h: 80 },
    recognition_results: [
      { name: 'Basil leaves', prob: 0.78 },
      { name: 'Herb garnish', prob: 0.55 },
    ],
  },
  {
    // Region 3: tiny box near top-left — exercises tier 3 (label below)
    contained_bbox: { x: 10, y: 5, w: 60, h: 28 },
    recognition_results: [{ name: 'Garnish', prob: 0.65 }],
  },
];
