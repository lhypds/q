import { Survey } from "./pages/Survey";
import { Results } from "./pages/Results";
import { Toast } from "./ui";

function App() {
  const params = new URLSearchParams(window.location.search);
  const isResults = params.get("view") === "results";
  return (
    <>
      {isResults ? <Results /> : <Survey />}
      <Toast />
    </>
  );
}

export default App;
