import cx from 'clsx';

export function Stack({ className, children }) {
  return <div className={cx('flex flex-col', className)}>{children}</div>;
}
