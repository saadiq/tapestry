import { useState, useEffect, useRef } from 'react';

interface InputModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputModal({
  isOpen,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        {message && <p className="py-4">{message}</p>}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="input input-bordered w-full mt-4"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="modal-action">
            <button type="button" className="btn" onClick={handleCancel}>
              {cancelText}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
              {confirmText}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleCancel}></div>
    </div>
  );
}
