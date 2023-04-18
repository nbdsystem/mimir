import { BaseLink } from './Link';

export function PageHeader() {
  return (
    <header className="flex h-14 items-center gap-x-6 border-b border-gray-300 bg-white px-4">
      <Logo />
      <PageNavigation />
    </header>
  );
}

function Logo() {
  return (
    <BaseLink className="flex h-full items-center text-lg font-bold" href="/">
      Mimir
    </BaseLink>
  );
}

const links = [
  {
    href: '/packages',
    text: 'Packages',
  },
  {
    href: '/repos',
    text: 'Repos',
  },
  {
    href: '/queue',
    text: 'Queue',
  },
];

function PageNavigation() {
  return (
    <nav aria-label="Page navigation" className="h-full">
      <ul className="flex h-full">
        {links.map((link) => {
          return (
            <li className="h-full" key={link.href}>
              <BaseLink
                href={link.href}
                className="flex h-full items-center border-b-2 border-t-2 border-transparent px-2 hover:bg-gray-100"
                activeClassName="border-b-black"
              >
                {link.text}
              </BaseLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
