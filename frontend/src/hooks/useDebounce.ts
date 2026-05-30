import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of `value` that only updates after `delayMs`
 * have passed without further changes. Use to avoid firing one API request
 * per keystroke from search inputs.
 *
 * @example
 *   const debouncedQuery = useDebounce(query, 300);
 *   useEffect(() => { fetch(...debouncedQuery) }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

export default useDebounce;
