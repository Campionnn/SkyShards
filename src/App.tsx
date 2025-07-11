import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components";
import { CalculatorStateProvider } from "./context/CalculatorStateContext";
import { RecipeStateProvider } from "./context/RecipeStateContext";

const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const RecipePage = lazy(() => import("./pages/RecipePage"));
const ShardPricesPage = lazy(() => import("./pages/ShardPricesPage"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>
);

const ProtectedLayout = () => (
  <CalculatorStateProvider>
    <RecipeStateProvider>
      <Layout />
    </RecipeStateProvider>
  </CalculatorStateProvider>
);

const isProd = import.meta.env.PROD;
const basename = isProd ? "/SkyShards" : "";

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
          path: "settings",
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
          path: "prices",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <ShardPricesPage />
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
