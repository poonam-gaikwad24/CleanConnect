interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'lg';
}

// Plain buttons/spans styled as stars — no icon or UI library needed,
// consistent with the rest of the app's "plain Tailwind, no extra
// deps unless genuinely needed" approach. Interactive when onChange is
// given (the submission form); otherwise a read-only display (review
// list, average rating).
function StarRating({ value, onChange, size = 'sm' }: StarRatingProps) {
  const textSize = size === 'lg' ? 'text-2xl' : 'text-base';
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <span className={`${textSize} leading-none text-amber-500`} aria-label={`${value} out of 5 stars`}>
        {stars.map((n) => (
          <span key={n}>{n <= value ? '★' : '☆'}</span>
        ))}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label="Rating" className={`${textSize} leading-none`}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className={`mr-0.5 ${n <= value ? 'text-amber-500' : 'text-slate-300'} hover:text-amber-400`}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

export default StarRating;
