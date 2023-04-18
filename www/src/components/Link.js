import cx from 'clsx';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export function BaseLink({ activeClassName, className, children, ...rest }) {
  const { asPath, isReady } = useRouter();
  const [computedClassName, setComputedClassName] = useState(className);

  useEffect(() => {
    // Check if the router fields are updated client-side
    if (isReady) {
      // Dynamic route will be matched via props.as
      // Static route will be matched via props.href
      const linkPathname = new URL(rest.as || rest.href, location.href)
        .pathname;

      // Using URL().pathname to get rid of query and hash
      const activePathname = new URL(asPath, location.href).pathname;

      const newClassName =
        linkPathname === activePathname
          ? cx(className, activeClassName)
          : className;

      setComputedClassName(newClassName);
    }
  }, [asPath, isReady, rest.as, rest.href, activeClassName, className]);

  return (
    <NextLink className={computedClassName} {...rest}>
      {children}
    </NextLink>
  );
}

export function Link({ className, ...rest }) {
  return (
    <BaseLink className={cx(className, 'text-blue-600 underline')} {...rest} />
  );
}
