import React from 'react'
import CloseButton from '../CloseButton'
import { css } from '../../../styled-system/css'

interface DialogTitleProps {
    children: React.ReactNode
    onClose: () => void    
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, onClose }) => {
    return (
        <div className={css({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        })}>
            <h2 className={css({
                fontWeight: '700',
                color: '#FFD6FC',
                borderBottom: 'none',
                fontSize: '1.25rem',
            })}>
                {children}
            </h2>
            <CloseButton onClose={onClose} />
        </div>
    );
};

export default DialogTitle