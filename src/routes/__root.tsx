import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPlugin } from "@tanstack/react-form-devtools";
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

interface MyRouterContext {
	queryClient: QueryClient;
}

// Development scripts for hot module replacement
const devScriptsToFixHMR = () => [
	{
		type: "module",
		children: `
			import RefreshRuntime from "/@react-refresh"
			RefreshRuntime.injectIntoGlobalHook(window)
			window.$RefreshReg$ = () => {}
			window.$RefreshSig$ = () => (type) => type
			window.__vite_plugin_react_preamble_installed__ = true
		`,
	},
	{
		type: "module",
		src: "/@vite/client",
	},
	{
		type: "module",
		src: "/~start/default-client-entry",
	},
];

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
		scripts: import.meta.env.PROD ? [] : devScriptsToFixHMR(),
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
});

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
					FormDevtoolsPlugin(),
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
