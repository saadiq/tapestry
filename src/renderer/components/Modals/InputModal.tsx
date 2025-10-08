import { useState, useEffect, useRef } from 'react';
import { isValidFilename, getFilenameValidationError } from '../../utils/fileValidation';

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
  /**
   * Enable filename validation (default: false)
   * When true, validates input against filesystem-unsafe characters
   */
  validateFilename?: boolean;
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
  validateFilename = false,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(defaultValue);
    setValidationError(null);
  }, [defaultValue]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Validate on value change
  useEffect(() => {
    if (validateFilename && value.trim()) {
      if (!isValidFilename(value.trim())) {
        setValidationError(getFilenameValidationError(value.trim()));
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [value, validateFilename]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = value.trim();

    // Validate before submitting
    if (!trimmedValue) {
      return;
    }

    if (validateFilename && !isValidFilename(trimmedValue)) {
      setValidationError(getFilenameValidationError(trimmedValue));
      return;
    }

    onConfirm(trimmedValue);
    setValue('');
    setValidationError(null);
  };

  const handleCancel = () => {
    setValue('');
    setValidationError(null);
    onCancel();
  };

  if (!isOpen) return null;

  // Determine if submit button should be disabled
  const isSubmitDisabled = !value.trim() || (validateFilename && !!validationError);

  return (
    <div className="modal modal-open" onClick={handleCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">{title}</h3>
        {message && <p className="py-4">{message}</p>}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`input input-bordered w-full mt-4 ${validationError ? 'input-error' : ''}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {validationError && (
            <p className="text-error text-sm mt-2">{validationError}</p>
          )}
          <div className="modal-action">
            <button type="button" className="btn" onClick={handleCancel}>
              {cancelText}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitDisabled}>
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
