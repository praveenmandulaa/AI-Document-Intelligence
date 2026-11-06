import { useState } from "react";
import { askDocuments, type AskResponse } from "../services/qa";
import "./Search.css";

export default function Search() {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await askDocuments({
        question: question.trim(),
        document_id: null,
        top_k: topK,
      });

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="qa-page">
      <header className="qa-header">
        <h1>AI Document Assistant</h1>
        <p>
          Ask questions about your uploaded PDFs and get AI-generated
          answers with document references.
        </p>
      </header>

      <section className="qa-form-card">
        <div className="qa-card-heading">
          <div className="qa-heading-icon">✦</div>
          <div>
            <h2>Ask Your Knowledge Base</h2>
            <p>Find answers from your indexed documents using Gemini AI.</p>
          </div>
        </div>

        <form onSubmit={handleAsk}>
          <label htmlFor="question">Your question</label>

          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: What are the responsibilities of the Full Stack Developer?"
            rows={5}
            maxLength={2000}
            required
          />

          <div className="qa-form-footer">
            <div className="qa-result-count">
              <label htmlFor="topK">Number of sources</label>
              <select
                id="topK"
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
                <option value={10}>Top 10</option>
              </select>
            </div>

            <button type="submit" disabled={loading || !question.trim()}>
              {loading ? "Generating answer..." : "✦ Ask Gemini"}
            </button>
          </div>
        </form>

        {loading && (
          <div className="qa-loading">
            <span className="qa-spinner" />
            <p>
              Searching your documents and generating an AI answer...
            </p>
          </div>
        )}

        {error && (
          <div className="qa-error" role="alert">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="qa-results">
          <div className="qa-results-heading">
            <div>
              <h2>AI Answer</h2>
              <p>Generated using your uploaded documents</p>
            </div>

            <span className="qa-model-badge">{result.model}</span>
          </div>

          <article className="qa-answer-card">
            <div className="qa-answer-title">
              <span>✦</span>
              <h3>Answer</h3>
            </div>

            <div className="qa-answer-text">{result.answer}</div>
          </article>

          <div className="qa-sources-heading">
            <div>
              <h2>Sources & References</h2>
              <p>
                {result.sources.length} relevant passages retrieved
                from your documents
              </p>
            </div>
          </div>

          <div className="qa-source-list">
            {result.sources.map((source) => (
              <article
                className="qa-source-card"
                key={`${source.document_id}-${source.chunk_index}`}
              >
                <div className="qa-source-header">
                  <div className="qa-source-file">
                    <span className="qa-file-icon">▤</span>
                    <div>
                      <h3>{source.filename}</h3>
                      <p>
                        {source.source_label} · Page {source.page_number} ·
                        Chunk #{source.chunk_index + 1}
                      </p>
                    </div>
                  </div>

                  <div className="qa-similarity">
                    <strong>{source.similarity.toFixed(1)}%</strong>
                    <span>Similarity</span>
                  </div>
                </div>

                <div className="qa-source-content">
                  {source.content}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}