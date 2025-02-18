import React from 'react';
import { css } from '../../../styled-system/css';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className={css({
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'modal',
            padding: '16px',
        })}>
            <div className={css({
                backgroundColor: '#000000',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '80%',
                border: '2px solid rgba(189, 189, 189, 0.16)',
            })}>
                {children}
            </div>
        </div>
    );
};

export default Dialog