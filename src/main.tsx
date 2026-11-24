import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableTapHaptics } from "./lib/haptics";
import { enablePrivacy } from "./lib/privacy";
import { preloadApp, queryClient } from "./lib/queries";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: "intent",
	defaultPreloadStaleTime: 0,
});

enableTapHaptics();
enablePrivacy();

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

preloadApp();

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
