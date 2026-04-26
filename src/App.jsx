import { Survey } from "@pages/Survey";
import { Results } from "@pages/Results";
import Home from "@pages/Home";
import { Toast } from "@ui";

function App() {
  const params = new URLSearchParams(window.location.search);
  const isResults = params.get("view") === "results";
  const isHome = !params.get("q");
  return (
    <>
      {isResults ? <Results /> : isHome ? <Home /> : <Survey />}
      <Toast />
    </>
  );
}

export default App;
