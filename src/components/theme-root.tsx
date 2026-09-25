"use client";

import * as React from "react";

const ThemeContainerContext = React.createContext<HTMLElement | null>(null);

/**
 * The nearest themed root's DOM node, or null outside of one. Base UI
 * Select/Popover/Combobox popups portal into `<body>` by default, which
 * sits outside every themed root and would not see its `style` CSS
 * variables; passing this as the popup's `container` keeps the edition's
 * Appearance Theme applied.
 */
export function useThemeContainer(): HTMLElement | null {
  return React.useContext(ThemeContainerContext);
}

type ThemeRootProps = {
  /**
   * Element tag for the root. Defaults to "div"; use "li" where the parent
   * requires list-item semantics (e.g. an `ArchiveCard` inside a `<ul>`).
   */
  as?: "div" | "li";
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Renders a War Week's themed root (Appearance Theme colors set as inline
 * `style`, per `warWeekThemeStyle`) and publishes its own DOM node through
 * context via `useThemeContainer`, so themed popups can portal inside it.
 */
export function ThemeRoot({
  as = "div",
  style,
  className,
  children,
}: ThemeRootProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const Tag = as;

  return (
    <Tag
      ref={setContainer as React.Ref<never>}
      style={style}
      className={className}
    >
      <ThemeContainerContext.Provider value={container}>
        {children}
      </ThemeContainerContext.Provider>
    </Tag>
  );
}
