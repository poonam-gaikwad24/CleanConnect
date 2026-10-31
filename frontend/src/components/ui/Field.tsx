import { cloneElement, ReactElement, useId } from 'react';

interface FieldProps {
  label: string;
  // Visible validation message; announced to screen readers when it appears.
  error?: string | null;
  help?: string;
  // The single form control (input, select, textarea). Field supplies its
  // id, aria-invalid and aria-describedby so label, hint and error are
  // always correctly associated — an existing id on the control is kept.
  children: ReactElement;
}

function Field({ label, error, help, children }: FieldProps) {
  const generated = useId();
  const id: string = children.props.id ?? generated;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const control = cloneElement(children, {
    id,
    'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-describedby': describedBy ?? children.props['aria-describedby'],
  });

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {control}
      {help && (
        <p id={helpId} className="help-text">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
