/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div css={css({
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'modal'
        })}>
            <div css={css({
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '0.5rem',
                maxWidth: '500px',
                width: '90%'
            })}>
                {children}
            </div>
        </div>
    );
};

export default Dialog