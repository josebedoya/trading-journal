import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Wrappers locale-aware de las APIs de navegación de Next.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
