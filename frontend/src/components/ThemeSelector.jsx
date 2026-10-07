import { useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTheme } from "@/providers/ThemeProvider";

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  // Controlamos el menú para poder cerrarlo después de elegir un tema.
  const [open, setOpen] = useState(false);

  const ThemeIcon =
    theme === "dark"
      ? MoonIcon
      : theme === "light"
        ? SunIcon
        : MonitorIcon;

  function changeTheme(newTheme) {
    setTheme(newTheme);

    // Una vez elegido el tema ya no necesitamos mantener el menú abierto.
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Cambiar tema"
          />
        }
      >
        <ThemeIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={changeTheme}
        >
          <DropdownMenuRadioItem value="light">
            <SunIcon />
            Claro
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="dark">
            <MoonIcon />
            Oscuro
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="system">
            <MonitorIcon />
            Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}