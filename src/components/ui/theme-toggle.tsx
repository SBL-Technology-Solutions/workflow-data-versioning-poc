import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const [theme, setTheme] = useState<"light" | "dark">("dark");

	const setThemeAndApply = (newTheme: "light" | "dark") => {
		setTheme(newTheme);
		document.documentElement.classList.toggle("dark", newTheme === "dark");
		localStorage.setItem("theme", newTheme);
	};

	useEffect(() => {
		const saved = localStorage.getItem("theme") as "light" | "dark" | null;
		setThemeAndApply(saved || "dark");
	}, []);

	const toggleTheme = () => {
		setThemeAndApply(theme === "light" ? "dark" : "light");
	};

	return (
		<Button variant="ghost" size="icon" onClick={toggleTheme}>
			<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
} 