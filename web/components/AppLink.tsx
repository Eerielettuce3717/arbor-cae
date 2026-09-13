"use client";

import NextLink from "next/link";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";

export const NativeLinkContext = createContext(false);

export function NativeLinkProvider({
  native,
  children,
}: {
  native: boolean;
  children: ReactNode;
}) {
  return (
    <NativeLinkContext.Provider value={native}>
      {children}
    </NativeLinkContext.Provider>
  );
}

type AppLinkProps = ComponentProps<typeof NextLink>;

export function AppLink({ href, prefetch, ...props }: AppLinkProps) {
  const native = useContext(NativeLinkContext);
  const url = typeof href === "string" ? href : href.toString();
  if (native) {
    return <a href={url} {...props} />;
  }
  return <NextLink href={href} prefetch={prefetch} {...props} />;
}
