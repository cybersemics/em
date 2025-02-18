import React from 'react';
import CloseButton from '../CloseButton';
import { css } from '../../../styled-system/css';

interface DialogTitleProps {
    children: React.ReactNode
    onClose?: () => void    
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, onClose }) => {
    return (
        <div className={css({
            display: 'flex',
        })}>
            <h2 className={css({
                fontWeight: 'bold',
                color: '#FFD6FC',
                borderBottom: 'none',
                fontSize: '1.25rem',
            })}>
                {children}
            </h2>
            {onClose && (
                <CloseButton onClose={onClose} />
            )}
        </div>
    );
};

export default DialogTitle