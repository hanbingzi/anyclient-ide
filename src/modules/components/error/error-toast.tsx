import React, { useEffect, useState } from 'react';
import cls from 'classnames';
import styles from './error-toast.module.less'; // 我们将在后面创建这个 CSS 文件
export interface ErrorToastParam {
  position: 'center' | 'fixed';
  positionXY?: { x: number; y: number };
  message: string;

  onClose: () => void;
}

export const ErrorToast = ({ message, position, positionXY, onClose }: ErrorToastParam) => {
  const [isVisible, setIsVisible] = useState(true);
  console.log('ErrorToast--》我为什么不显示');
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div className={cls(styles['error-toast'], position === 'center' ? styles['center-toast'] : styles[''])}>
      <p>{message}</p>
    </div>
  );
};
