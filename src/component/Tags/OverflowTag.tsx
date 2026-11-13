import React, { useRef, useState } from 'react';
import { Tooltip } from '@mui/material';
import Tag from './Tag';

/**
 * @file OverflowTag.tsx
 * @summary A `Tag` that shows a tooltip with its full text only when the text
 * is actually truncated (ellipsized).
 *
 * `Tag` doesn't forward arbitrary props (like `onMouseEnter`) down to its
 * underlying DOM node, so the generic `OverflowTooltip` (which clones its
 * child to inject hover handlers) can't be used directly on it. Instead this
 * attaches the hover handler to a wrapping `span` and measures the `Tag`'s
 * own inner span (found via `querySelector`) for overflow.
 */

interface OverflowTagProps {
  text: string;
  className?: string;
  css?: React.CSSProperties;
}

const OverflowTag: React.FC<OverflowTagProps> = ({ text, className, css }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    const el = spanRef.current?.querySelector('span') as HTMLElement;
    if (el) setShowTooltip(el.scrollWidth > el.clientWidth);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <Tooltip title={showTooltip ? text : ''} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -8] } }] } }}>
      <span
        ref={spanRef}
        // minWidth: 0 is a no-op outside a flex/grid item (harmless for
        // every other usage) but required inside one: a flex item's default
        // `min-width: auto` sizes it to its content's intrinsic width,
        // silently defeating `overflow`/ellipsis truncation.
        style={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Tag text={text} className={className} css={{ ...css, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }} />
      </span>
    </Tooltip>
  );
};

export default OverflowTag;
