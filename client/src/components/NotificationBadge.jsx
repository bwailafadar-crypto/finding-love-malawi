import { useState, useEffect, useRef } from 'react';

export default function NotificationBadge({ count }) {
  const [animate, setAnimate] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      setAnimate(true);
      prevCount.current = count;
      const timer = setTimeout(() => setAnimate(false), 400);
      return () => clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count]);

  if (!count || count <= 0) return null;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[20px] h-5 px-1.5
        bg-pink-500 text-white text-[10px] font-bold
        rounded-full
        ${animate ? 'animate-badge-pop' : ''}
      `}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
