import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import type { SelectionState } from '../../types/image';
import './SwipeCard.css';

const SWIPE_THRESHOLD = 120;
const FLY_DISTANCE = 600;

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipe: (state: SelectionState) => void;
  disabled?: boolean;
}

export function SwipeCard({ children, onSwipe, disabled }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-FLY_DISTANCE, FLY_DISTANCE], [-30, 30]);

  const selectOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-20, -SWIPE_THRESHOLD], [0, 1]);

  const isDragging = useRef(false);

  const flyOff = (direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? FLY_DISTANCE * 1.5 : -FLY_DISTANCE * 1.5;
    void animate(x, targetX, { type: 'tween', duration: 0.25, ease: 'easeIn' }).then(() => {
      onSwipe(direction === 'right' ? 'selected' : 'rejected');
      x.set(0);
      y.set(0);
    });
  };

  const springBack = () => {
    void animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    void animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  const bind = useDrag(
    ({ active, movement: [mx, my], velocity: [vx], direction: [dx] }) => {
      if (disabled) return;
      isDragging.current = active;
      x.set(active ? mx : x.get());
      y.set(active ? my : y.get());

      if (!active) {
        const overThreshold = Math.abs(mx) > SWIPE_THRESHOLD;
        const fastFlick = Math.abs(vx) > 0.5;

        if (overThreshold || fastFlick) {
          flyOff(dx > 0 ? 'right' : 'left');
        } else {
          springBack();
        }
      }
    },
    { filterTaps: true, from: () => [x.get(), y.get()] }
  );

  return (
    <motion.div
      className="swipe-card"
      style={{ x, y, rotate, touchAction: 'none' }}
      {...(bind() as object)}
    >
      {children}

      <motion.div className="swipe-overlay swipe-overlay-select" style={{ opacity: selectOpacity }}>
        SELECT
      </motion.div>
      <motion.div className="swipe-overlay swipe-overlay-reject" style={{ opacity: rejectOpacity }}>
        REJECT
      </motion.div>
    </motion.div>
  );
}
