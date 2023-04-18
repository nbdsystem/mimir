import cx from 'clsx';
import css from './Page.module.css';

export function Page({ children }) {
  return <div className={cx(css.layout, 'bg-gray-50')}>{children}</div>;
}
