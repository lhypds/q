import SurveyPage from "./SurveyPage";
import ResultsPage from "./ResultsPage";

function App() {
  const params = new URLSearchParams(window.location.search);
  const isResults = params.get("view") === "results";
  return isResults ? <ResultsPage /> : <SurveyPage />;
}

export default App;
