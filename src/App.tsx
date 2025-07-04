import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CalculatorPage } from "./pages/CalculatorPage";
import { SettingsPage } from "./pages/SettingsPage";

// Force cache bust - July 4, 2025
const App = () => {
  return (
    <Router basename="/SkyShards">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CalculatorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
