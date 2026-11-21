import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableTapHaptics } from "./lib/haptics";
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

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

// the splash in index.html stays up until the main screens are cached, at most 3s
const splashLimit = new Promise((resolve) => setTimeout(resolve, 3000));

Promise.race([preloadApp(), splashLimit]).then(() =>
	createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</StrictMode>,
	),
);
