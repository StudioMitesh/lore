import React from 'react';

export function useImageKeyboardNavigation(
    isOpen: boolean,
    onNavigate: (direction: 'prev' | 'next') => void,
    onClose: () => void
) {
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    onNavigate('prev');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    onNavigate('next');
                    break;
                case 'Escape':
                    event.preventDefault();
                    onClose();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onNavigate, onClose]);
}
