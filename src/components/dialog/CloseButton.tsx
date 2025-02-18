interface CloseButtonProps {
    onClick: () => void
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClick }) => {
    return (
        <button onClick={onClick} className="p-2 rounded-full hover:bg-gray-200">
            ✖
        </button>
    );
};

export default CloseButton