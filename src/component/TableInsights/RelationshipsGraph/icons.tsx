import React from 'react';

interface LineCircleIconProps {
  size?: number;
  color?: string;
}

// Exact path supplied by the user (Material Symbols "line_end_circle"):
// a horizontal line ending in a circle on the right — "—o".
const END_CIRCLE_PATH =
  'M12.6 11.25a2.17 2.17 0 001.594-.656A2.2 2.2 0 0014.85 9a2.17 2.17 0 00-.656-1.594A2.17 2.17 0 0012.6 6.75a2.2 2.2 0 00-1.594.656A2.17 2.17 0 0010.35 9q0 .92.656 1.594.675.656 1.594.656m0 1.35q-1.33 0-2.325-.825a3.6 3.6 0 01-1.219-2.1H1.8v-1.35h7.256a3.53 3.53 0 011.219-2.081A3.48 3.48 0 0112.6 5.4q1.5 0 2.55 1.05T16.2 9t-1.05 2.55-2.55 1.05';

/** "—o" : line then circle (target / incoming). */
export const LineEndCircleIcon: React.FC<LineCircleIconProps> = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 18 18" width={size} height={size} aria-hidden="true" style={{ color, flexShrink: 0 }}>
    <path fill="currentColor" d={END_CIRCLE_PATH} />
  </svg>
);

/** "o—" : circle then line (source / outgoing) — the end-circle path mirrored horizontally. */
export const LineStartCircleIcon: React.FC<LineCircleIconProps> = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 18 18" width={size} height={size} aria-hidden="true" style={{ color, flexShrink: 0 }}>
    <g transform="translate(18,0) scale(-1,1)">
      <path fill="currentColor" d={END_CIRCLE_PATH} />
    </g>
  </svg>
);
