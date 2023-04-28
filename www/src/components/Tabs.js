import cx from 'clsx';
import * as React from 'react';

const TabsContext = React.createContext();
const TabContext = React.createContext();
const TabPanelContext = React.createContext();

function Tabs({ children }) {
  const id = React.useId();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  return (
    <TabsContext.Provider
      value={{
        activeIndex,
        setActiveIndex,
        selectedIndex,
        setSelectedIndex,
        id,
      }}
    >
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  const tabsContext = React.useContext(TabsContext);
  const count = React.Children.count(children);
  const refs = [];

  return (
    <div
      className="flex bg-white text-sm"
      onKeyDown={(event) => {
        if (event.key === 'Home') {
          event.preventDefault();
          event.stopPropagation();
          tabsContext.setActiveIndex(0);
          refs[0].focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          event.stopPropagation();
          tabsContext.setActiveIndex(count - 1);
          refs[count - 1].focus();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          const nextIndex = Math.min(tabsContext.activeIndex + 1, count - 1);
          tabsContext.setActiveIndex(nextIndex);
          refs[nextIndex].focus();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          event.stopPropagation();
          const nextIndex = Math.max(tabsContext.activeIndex - 1, 0);
          tabsContext.setActiveIndex(nextIndex);
          refs[nextIndex].focus();
        }
      }}
    >
      {React.Children.map(children, (child, index) => {
        return (
          <TabContext.Provider value={{ index }}>
            {React.cloneElement(child, {
              ref: (element) => {
                refs[index] = element;
              },
            })}
          </TabContext.Provider>
        );
      })}
    </div>
  );
}

const Tab = React.forwardRef(function Tab({ children }, ref) {
  const tabsContext = React.useContext(TabsContext);
  const tabContext = React.useContext(TabContext);
  const id = `${tabsContext.id}-tab-${tabContext.index}`;
  const panelId = `${tabsContext.id}-tab-panel-${tabContext.index}`;
  const selected = tabsContext.selectedIndex === tabContext.index;
  const active = tabsContext.activeIndex === tabContext.index;

  return (
    <button
      ref={ref}
      aria-controls={panelId}
      aria-selected={selected}
      className={cx('px-4 py-2 hover:bg-gray-100', {
        ['border-b-2 border-t-2 border-b-black border-t-transparent']: selected,
      })}
      id={id}
      onClick={() => {
        tabsContext.setSelectedIndex(tabContext.index);
        tabsContext.setActiveIndex(tabContext.index);
      }}
      role="tab"
      tabIndex={active ? undefined : -1}
      type="button"
    >
      {children}
    </button>
  );
});

function TabPanels({ children }) {
  return (
    <>
      {React.Children.map(children, (child, index) => {
        return (
          <TabPanelContext.Provider value={{ index }}>
            {child}
          </TabPanelContext.Provider>
        );
      })}
    </>
  );
}

function TabPanel({ className, children }) {
  const tabsContext = React.useContext(TabsContext);
  const panelContext = React.useContext(TabPanelContext);
  const id = `${tabsContext.id}-tab-panel-${panelContext.index}`;
  const tabId = `${tabsContext.id}-tab-${panelContext.index}`;
  const selected = tabsContext.selectedIndex === panelContext.index;

  return (
    <div
      aria-labelledby={tabId}
      className={className}
      id={id}
      role="tabpanel"
      hidden={!selected}
    >
      {children}
    </div>
  );
}

export { Tabs, TabList, Tab, TabPanels, TabPanel };
