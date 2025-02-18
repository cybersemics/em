interface DialogTitleProps {
    children: React.ReactNode
    onClose?: () => void    
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, onClose }) => {
    return (
        <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold">{children}</h2>
            {onClose && (
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                    ✖
                </button>
            )}
        </div>
    );
};

export default DialogTitle