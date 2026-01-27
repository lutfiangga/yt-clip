import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Button({ className, variant = 'primary', ...props }) {
  return (
    <button
      className={twMerge(
        'px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20',
        variant === 'secondary' && 'bg-gray-700 hover:bg-gray-600 text-gray-100',
        variant === 'outline' && 'border border-gray-600 hover:border-gray-500 text-gray-300',
        className
      )}
      {...props}
    />
  );
}
