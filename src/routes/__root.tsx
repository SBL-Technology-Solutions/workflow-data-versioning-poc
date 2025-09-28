import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type ReactNode, useEffect, useState } from "react";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import Header from "@/components/Header";
import { NotFound } from "@/components/NotFound";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/styles/app.css?url";
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{
					charSet: "utf-8",
				},
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1",
				},
				{
					title: "ApproveOS",
				},
			],
			links: [
				{
					rel: "stylesheet",
					href: appCss,
				},
			],
		}),
		errorComponent: (props) => {
			return (
				<RootDocument>
					<DefaultCatchBoundary {...props} />
				</RootDocument>
			);
		},
		notFoundComponent: () => <NotFound />,
		component: RootComponent,
	},
);

function RootComponent() {
	const [showSplash, setShowSplash] = useState(true);

	useEffect(() => {
		const value = window.sessionStorage.getItem("showSplash");
		if (value === "false") {
			setShowSplash(false);
		}
	}, []);

	const handleDismissSplash = () => {
		setShowSplash(false);
		sessionStorage.setItem("showSplash", "false");
	};

	return (
		<RootDocument>
			<SplashScreen show={showSplash} onDismiss={handleDismissSplash} />
			{!showSplash && <Header />}
			{!showSplash && <Outlet />}
			{!showSplash && <Toaster />}
			<TanStackDevtools
				plugins={[
					//TODO: Add FormDevtoolsPlugin back in as it slowing down the form significantly right now
					// FormDevtoolsPlugin(),
					{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
					{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
				]}
			/>
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
