import React from "react";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", confirmClass = "bg-red-600 text-white" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <button className="absolute top-2 right-2 text-gray-600" onClick={onClose}>
          &#10005;
        </button>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-2">{message}</p>
        <div className="flex justify-end mt-4 space-x-2">
          <button
            className="border border-gray-400 text-gray-700 px-4 py-2 rounded"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`${confirmClass} px-4 py-2 rounded`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
