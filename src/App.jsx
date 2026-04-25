import { Survey } from "./pages/Survey";
import { Results } from "./pages/Results";

function App() {
  const params = new URLSearchParams(window.location.search);
  const isResults = params.get("view") === "results";
  return isResults ? <Results /> : <Survey />;
}

export default App;
