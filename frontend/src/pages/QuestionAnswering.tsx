
import { useEffect, useState } from "react";
import axios from "axios";
import type { FormEvent } from "react";
import {
  Bot,
  Send,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  BookOpen,
} from "lucide-react";

import api from "../api/client";
import {
  askDocuments,
} from "../services/qa";

import type {
  AskResponse,
  QASource,
} from "../services/qa";

type DocumentItem = {
  id: number;
  original_filename: string;
  page_count: number;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (error.response?.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (error.response?.status === 429) {
      return "Too many requests. Please try again shortly.";
    }

    if (error.response?.status && error.response.status >= 500) {
      return "The AI service encountered a server error. Check the backend terminal.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to generate an answer. Please try again.";
}

function formatSimilarity(value: number) {
  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
}

export default function QuestionAnswering() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [question, setQuestion] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("all");
  const [topK, setTopK] = useState(5);

  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [asking, setAsking] = useState(false);

  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState("");
  const [documentError, setDocumentError] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await api.get("/documents");
        const data = response.data;

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.documents)
              ? data.documents
              : [];

        setDocuments(items);
      } catch (err) {
        setDocumentError(
          "Unable to load your documents. Please refresh the page."
        );
      } finally {
        setLoadingDocuments(false);
      }
    }

    void loadDocuments();
  }, []);

    async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Please enter a question.");
      return;
    }

    if (documents.length === 0) {
      setError("Upload and index a PDF before asking questions.");
      return;
    }

    setAsking(true);
    setError("");
    setResult(null);

    try {
      const response = await askDocuments({
        question: trimmedQuestion,
        document_id:
          selectedDocument === "all"
            ? null
            : Number(selectedDocument),
        top_k: topK,
      });

      setResult(response);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAsking(false);
    }
  }

  function handleExampleQuestion(value: string) {
    setQuestion(value);
    setError("");
  }

  return (
    <div className="dashboard qa-page">
      <div className="page-heading">
        <div>
          <h1>AI Question Answering</h1>
          <p>
            Ask questions about your PDFs and get AI-generated
            answers with source references.
          </p>
        </div>
      </div>

      <div className="qa-hero">
        <div className="qa-hero-icon">
          <Bot size={30} />
        </div>

        <div>
          <h2>Chat with your documents</h2>
          <p>
            Powered by Retrieval-Augmented Generation (RAG)
            and Google Gemini.
          </p>
        </div>
        <Sparkles className="qa-hero-sparkle" size={26} />
      </div>

      <div className="content-card qa-input-card">
        <div className="qa-section-heading">
          <div className="qa-section-icon">
            <BookOpen size={21} />
          </div>
          <div>
            <h2>Ask your question</h2>
            <p>
              Select a document or search across your entire library.
            </p>
          </div>
        </div>

        {documentError && (
          <div className="qa-error">
            <AlertCircle size={18} />
            {documentError}
          </div>
        )}

        <form className="qa-form" onSubmit={handleAsk}>
          <label htmlFor="qa-question">
            Your question
          </label>

          <textarea
            id="qa-question"
            rows={4}
            placeholder="Example: Explain the main responsibilities mentioned in my resume."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={asking}
          />

          <div className="qa-filters">
            <div className="qa-field">
              <label htmlFor="qa-document">
                Search in
              </label>

              <select
                id="qa-document"
                value={selectedDocument}
                onChange={(event) =>
                  setSelectedDocument(event.target.value)
                }
                disabled={loadingDocuments || asking}
              >
                <option value="all">All documents</option>

                {documents.map((document) => (
                  <option
                    key={document.id}
                    value={document.id}
                  >
                    {document.original_filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="qa-field">
              <label htmlFor="qa-top-k">
                Number of context passages
              </label>

              <select
                id="qa-top-k"
                value={topK}
                onChange={(event) =>
                  setTopK(Number(event.target.value))
                }
                disabled={asking}
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>

          <div className="qa-form-footer">
            <span className="qa-document-count">
              {loadingDocuments
                ? "Loading documents..."
                : `${documents.length} documents available`}
            </span>

            <button
              type="submit"
              className="qa-submit"
              disabled={
                asking ||
                loadingDocuments ||
                documents.length === 0
              }
            >
              {asking ? (
                <>
                  <LoaderCircle className="qa-spinner" size={18} />
                  Generating answer...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Ask Gemini
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {!result && !asking && !error && (
        <div className="content-card qa-examples">
          <h3>
            <Sparkles size={19} />
            Try asking these questions
          </h3>

          <div className="qa-example-list">
            {[
              "Summarize the main points in my document.",
              "What are the important technical skills mentioned?",
              "Explain the key topics covered in this document.",
              "What are the main responsibilities and requirements?",
            ].map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => handleExampleQuestion(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="qa-error qa-main-error">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {asking && (
        <div className="content-card qa-loading">
          <LoaderCircle className="qa-spinner" size={34} />
          <h3>Gemini is analyzing your documents</h3>
          <p>
            Retrieving relevant passages and generating your answer.
          </p>
        </div>
      )}

      {result && (
        <div className="qa-results">
          <div className="qa-answer-card">
            <div className="qa-answer-heading">
              <div className="qa-answer-icon">
                <Bot size={22} />
              </div>

              <div>
                <h2>AI Generated Answer</h2>
                <p>
                  {result.model || "Gemini"} ·
                  {" "}Based on your document context
                </p>
              </div>

              <CheckCircle2
                className="qa-answer-success"
                size={22}
              />
            </div>

            <div className="qa-question-display">
              <strong>Your question</strong>
              <p>{result.question || question}</p>
            </div>

            <div className="qa-answer-content">
              {result.answer}
            </div>
          </div>

          <div className="content-card qa-sources-card">
            <div className="qa-sources-heading">
              <div>
                <h2>
                  <FileText size={21} />
                  Source References
                </h2>
                <p>
                  Passages retrieved to support the generated answer.
                </p>
              </div>

              <span className="qa-source-count">
                {result.sources?.length ?? 0} sources
              </span>
            </div>

            {!result.sources?.length ? (
              <p className="muted-text">
                No source references were returned by the backend.
              </p>
            ) : (
              <div className="qa-source-list">
                {result.sources.map(
                  (source: QASource, index: number) => (
                    <div
                      className="qa-source-item"
                      key={`${source.document_id}-${source.chunk_index}-${index}`}
                    >
                      <div className="qa-source-header">
                        <div className="qa-source-file">
                          <div className="qa-source-file-icon">
                            <FileText size={20} />
                          </div>

                          <div>
                            <strong>{source.filename}</strong>
                            <p>
                              Page {source.page_number} ·
                              {" "}Chunk #{source.chunk_index}
                            </p>
                          </div>
                        </div>

                        <span className="qa-source-score">
                          {formatSimilarity(source.similarity)}
                          <small>Similarity</small>
                        </span>
                      </div>

                      <div className="qa-source-content">
                        {source.content}
                      </div>

                      {source.source_label && (
                        <div className="qa-source-label">
                          Source: {source.source_label}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
