import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components";
import { CalculatorStateProvider, RecipeStateProvider, ImagePreloadProvider } from "./context";
import { usePageTitle } from "./hooks";
import { ToastProvider } from "./components";

const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const RecipePage = lazy(() => import("./pages/RecipePage"));
const GuidePage = lazy(() => import("./pages/GuidePage").then((module) => ({ default: module.GuidePage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((module) => ({ default: module.AboutPage })));

const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>
);

const AppWithProviders = () => {
  return (
    <ToastProvider>
      <Layout />
    </ToastProvider>
  );
};

const ProtectedLayout = () => {
  usePageTitle(); // Update page title based on route

  return (
    <ImagePreloadProvider>
      <CalculatorStateProvider>
        <RecipeStateProvider>
          <AppWithProviders />
        </RecipeStateProvider>
      </CalculatorStateProvider>
    </ImagePreloadProvider>
  );
};

const isProd = import.meta.env.PROD;
const isGitHubPages = import.meta.env.BASE_URL.includes("/SkyShards/");
const basename = isProd && isGitHubPages ? "/SkyShards" : "";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <ProtectedLayout />,
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <CalculatorPage />
            </Suspense>
          ),
        },
        {
          path: "shards",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <SettingsPage />
            </Suspense>
          ),
        },
        {
          path: "recipes",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <RecipePage />
            </Suspense>
          ),
        },
        {
          path: "guide",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <GuidePage />
            </Suspense>
          ),
        },
        {
          path: "about",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <AboutPage />
            </Suspense>
          ),
        },
        {
          path: "contact",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <ContactPage />
            </Suspense>
          ),
        },
        {
          path: "privacy-policy",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <PrivacyPolicy />
            </Suspense>
          ),
        },
        {
          path: "client-privacy-policy",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <PrivacyPolicy />
            </Suspense>
          ),
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
  ],
  {
    basename,
  }
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
