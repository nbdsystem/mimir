import * as React from 'react';
import { TextSettings } from './Text';

export function Breadcrumbs({ children, className, label }) {
  const count = React.Children.count(children);
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex text-sm">
        {React.Children.map(children, (child, index) => {
          if (index === count - 1) {
            return <li key={index}>{child}</li>;
          }
          return (
            <React.Fragment key={index}>
              <TextSettings inherit>
                <li className="text-gray-500 hover:underline">{child}</li>
              </TextSettings>
              <li aria-hidden="true" className="mx-2 text-gray-500">
                /
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
