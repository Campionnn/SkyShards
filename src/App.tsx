import { createBrowserRouter, RouterProvider, Navigate, useSearchParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components";
import { GridStateProvider, GreenhouseDataProvider, LockedPlacementsProvider, DesignerProvider, InfoModalProvider } from "./context";
import { usePageTitle, usePreloadGroundImages } from "./hooks";
import { ToastProvider } from "./components";
import { CropMutationInfoModal } from "./components/calculator/CropMutationInfoModal";

const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const DesignerPage = lazy(() => import("./pages/DesignerPage").then((module) => ({ default: module.DesignerPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

// Component to handle redirect from /?layout=X to /designer?layout=X
const IndexRouteWithRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const layoutCode = searchParams.get("layout");
  
  // If layout param exists, redirect to designer with the same param
  if (layoutCode) {
    return <Navigate to={`/designer?layout=${layoutCode}`} replace />;
  }
  
  // Otherwise, show the calculator page
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CalculatorPage />
    </Suspense>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
  </div>
);

const AppWithProviders = () => {
  usePageTitle();
  usePreloadGroundImages(); // Preload ground textures on mount
  return <Layout />;
};

const ProtectedLayout = () => {
  return (
    <GreenhouseDataProvider>
      <GridStateProvider>
        <LockedPlacementsProvider>
          <DesignerProvider>
            <InfoModalProvider>
              <AppWithProviders />
              <CropMutationInfoModal />
            </InfoModalProvider>
          </DesignerProvider>
        </LockedPlacementsProvider>
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
        element: <IndexRouteWithRedirect />,
      },
      {
        path: "designer",
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <DesignerPage />
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
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
};

export default App;
