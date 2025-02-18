import React from 'react';
import { css } from '../../../styled-system/css';

interface DialogTitleProps {
    children: React.ReactNode
    onClose?: () => void    
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, onClose }) => {
    return (
        <div className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        })}>
            <h2>
                {children}
            </h2>
            {onClose && (
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                    ✖
                </button>
            )}
        </div>
    );
};

export default DialogTitle