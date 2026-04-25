import { useState, useMemo } from "react";

function parseSurvey(search) {
  const params = new URLSearchParams(search);
  const title = params.get("title") || "Survey";

  // Build survey JSON (for storage)
  const surveyObj = {};
  for (const [k, v] of params.entries()) {
    surveyObj[k] = v;
  }

  // Parse questions
  const questions = [];
  let i = 1;
  while (params.has(`q${i}`)) {
    const qText = params.get(`q${i}`);
    const answers = [];
    let j = 1;
    while (params.has(`q${i}a${j}`)) {
      answers.push({ key: `q${i}a${j}`, label: params.get(`q${i}a${j}`) });
      j++;
    }
    questions.push({ key: `q${i}`, text: qText, answers });
    i++;
  }

  return { title, questions, surveyObj };
}

export default function SurveyPage() {
  const { title, questions, surveyObj } = useMemo(() => parseSurvey(window.location.search), []);

  const [selections, setSelections] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const allAnswered = questions.every((q) => selections[q.key]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allAnswered) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/surveyresult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: surveyObj, result: selections }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit. Please try again. " + err.message);
    }
  }

  const resultsUrl = window.location.pathname + window.location.search + (window.location.search ? "&" : "?") + "view=results";

  if (submitted) {
    return (
      <div className="page">
        <div className="card thank-you-card">
          <h2 className="card-title">Thank you!</h2>
          <p className="thank-you-text">Your response has been recorded.</p>
          <a href={resultsUrl} className="results-link">
            View Results →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{title}</h1>
      <form onSubmit={handleSubmit}>
        {questions.map((q) => (
          <div key={q.key} className="card">
            <div className="card-header">
              <h2 className="card-title">{q.text}</h2>
              <span className="badge">{q.key}</span>
            </div>
            <p className="card-desc">Select one option below.</p>
            <div className="options">
              {q.answers.map((a) => (
                <label key={a.key} className={`option-label ${selections[q.key] === a.key ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name={q.key}
                    value={a.key}
                    checked={selections[q.key] === a.key}
                    onChange={() => setSelections((prev) => ({ ...prev, [q.key]: a.key }))}
                  />
                  <span className="option-text">{a.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="card">
            <p className="card-desc">No questions found in URL parameters.</p>
            <p className="card-desc example">
              Example: <code>?title=My Survey&amp;q1=How are you?&amp;q1a1=Great&amp;q1a2=Fine</code>
            </p>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {questions.length > 0 && (
          <div className="submit-row">
            <button type="submit" className="submit-btn" disabled={!allAnswered}>
              Submit
            </button>
            <a href={resultsUrl} className="results-link small">
              View Results →
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
