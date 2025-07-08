import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	// TODO: Add Tanstack Start theme provider as Sonner uses next-themes which only works correctly with nextjs, example here - https://gist.github.com/WellDone2094/16107a2a9476b28a5b394bee3fa1b8a3
	const theme = "light";

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
