import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Header() {
	return (
		<header className="px-4 py-1 flex gap-2 bg-background border-b border-border justify-between items-center">
			<nav className="flex flex-row">
				<div className="px-2 font-bold">
					<Link to="/" className="text-foreground hover:text-foreground/80 transition-colors">
						Home
					</Link>
				</div>
			</nav>
			<div className="flex items-center">
				<ThemeToggle />
			</div>
		</header>
	);
}
