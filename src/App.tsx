import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CalculatorPage } from "./pages/CalculatorPage";
import { SettingsPage } from "./pages/SettingsPage";

const App = () => {
  return (
    <Router basename="/shards">
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
