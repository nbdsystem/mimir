import cx from 'clsx';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useMemo,
} from 'react';

const tokens = {
  'display-01': 'text-6xl',
  'display-02': 'text-5xl',
  'display-03': 'text-4xl',
  'heading-01': 'text-3xl',
  'heading-02': 'text-2xl',
  'heading-03': 'text-1xl',
};

export function Text({
  asChild,
  children,
  className: customClassName,
  token,
  ...rest
}) {
  const mappings = {};
  for (const [key, value] of Object.entries(tokens)) {
    mappings[value] = token === key;
  }
  if (asChild) {
    const child = Children.only(children);
    return cloneElement(child, {
      ...rest,
      className: cx(customClassName, mappings, child.props.className),
    });
  }
  return <div className={cx(customClassName, mappings)}>{children}</div>;
}

const TextSettingsContext = createContext({
  inherit: false,
});

export function TextSettings({ children, inherit }) {
  const value = useMemo(() => {
    return {
      inherit,
    };
  }, [inherit]);
  return (
    <TextSettingsContext.Provider value={value}>
      {children}
    </TextSettingsContext.Provider>
  );
}

export function useTextSettings() {
  return useContext(TextSettingsContext);
}
