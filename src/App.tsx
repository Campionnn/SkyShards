import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components";
import { GridStateProvider, GreenhouseDataProvider } from "./context";
import { usePageTitle } from "./hooks";
import { ToastProvider } from "./components";

const GridPage = lazy(() => import("./pages/GridPage").then((module) => ({ default: module.GridPage })));
const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
  usePageTitle();

  return (
    <GreenhouseDataProvider>
      <GridStateProvider>
        <AppWithProviders />
      </GridStateProvider>
    </GreenhouseDataProvider>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <GridPage />
          </Suspense>
        ),
      },
      {
        path: "calculator",
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <CalculatorPage />
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
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
