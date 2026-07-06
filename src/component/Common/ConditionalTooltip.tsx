import { Tooltip, type TooltipProps } from '@mui/material';
import React, { useRef, useState, useEffect, type ReactElement } from 'react';

interface ConditionalTooltipProps extends Omit<TooltipProps, 'children' | 'title'> {
  children: ReactElement<any>;
  text: string;
}

const ConditionalTooltip: React.FC<ConditionalTooltipProps> = ({ text, children, ...props }) => {
  const textElementRef = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = () => {
    if (textElementRef.current) {
      const { clientWidth, scrollWidth } = textElementRef.current;
      setIsOverflowing(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkOverflow();
    // Re-check on window resize in case the container width changes
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <Tooltip title={text} disableHoverListener={!isOverflowing} placement="top" {...props}>
      {React.cloneElement(children as any, {
        ref: textElementRef,
      })}
    </Tooltip>
  );
};

export default ConditionalTooltip;