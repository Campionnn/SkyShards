import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from "react";
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from "react-router-dom";
import { Layout, ToastProvider } from "./components";
import { CalculatorStateProvider, RecipeStateProvider } from "./context";
import { usePageTitle, useShardIconPreload } from "./hooks";

const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((m) => ({ default: m.CalculatorPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const RecipePage = lazy(() => import("./pages/RecipePage").then((m) => ({ default: m.RecipePage })));
const FusionGraphPage = lazy(() => import("./pages/FusionGraphPage").then((m) => ({ default: m.FusionGraphPage })));
const GuidePage = lazy(() => import("./pages/GuidePage").then((m) => ({ default: m.GuidePage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>
);

const RootLayout = () => {
  usePageTitle();
  useShardIconPreload();

  return (
    <CalculatorStateProvider>
      <RecipeStateProvider>
        <ToastProvider>
          <Layout />
        </ToastProvider>
      </RecipeStateProvider>
    </CalculatorStateProvider>
  );
};

/** Every page is code-split. A page without a path is the index route. */
const PAGES: Array<{ path?: string; Page: LazyExoticComponent<ComponentType> }> = [
  { Page: CalculatorPage },
  { path: "shards", Page: SettingsPage },
  { path: "recipes", Page: RecipePage },
  { path: "fusion-lines", Page: FusionGraphPage },
  { path: "guide", Page: GuidePage },
  { path: "about", Page: AboutPage },
  { path: "contact", Page: ContactPage },
  { path: "privacy-policy", Page: PrivacyPolicy },
  { path: "client-privacy-policy", Page: PrivacyPolicy },
];

const pageRoutes: RouteObject[] = PAGES.map(({ path, Page }) => {
  const element = (
    <Suspense fallback={<LoadingSpinner />}>
      <Page />
    </Suspense>
  );
  return path ? { path, element } : { index: true, element };
});

// "/" normally; "/SkyShards/" for the GitHub Pages build (see vite.config.ts).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter(
  [
    { path: "/", element: <RootLayout />, children: pageRoutes },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  { basename },
);

export const App = () => <RouterProvider router={router} />;
