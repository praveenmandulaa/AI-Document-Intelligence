
import { useEffect, useState } from "react";
import { FileText, Layers, Search, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client";

type DocumentItem = {
  id: number;
  original_filename: string;
  page_count: number;
  created_at?: string;
};

export default function Dashboard() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await api.get("/documents");
        const data = response.data;

        setDocuments(Array.isArray(data) ? data : data.items ?? []);
      } catch {
        setError("Unable to load documents.");
      } finally {
        setLoading(false);
      }
    }

    void loadDocuments();
  }, []);

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Manage your documents and explore AI-powered search.</p>
        </div>

        <Link to="/documents" className="primary-link">
          <Upload size={18} />
          Upload Document
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <FileText size={25} />
          <p>Total Documents</p>
          <h2>{loading ? "..." : documents.length}</h2>
        </div>

        <div className="stat-card">
          <Layers size={25} />
          <p>Total Pages</p>
          <h2>
            {loading
              ? "..."
              : documents.reduce(
                  (sum, doc) => sum + (doc.page_count || 0),
                  0
                )}
          </h2>
        </div>

        <div className="stat-card">
          <Search size={25} />
          <p>Semantic Search</p>
          <h2>Available</h2>
        </div>
      </div>

      <div className="content-card">
        <h2>Recent Documents</h2>

        {error && <p className="error-message">{error}</p>}

        {!loading && !error && documents.length === 0 && (
          <p>No documents uploaded yet.</p>
        )}

        {documents.slice(0, 5).map((doc) => (
          <div className="document-row" key={doc.id}>
            <FileText size={20} />
            <span>{doc.original_filename}</span>
            <span>{doc.page_count} pages</span>
          </div>
        ))}
      </div>
    </div>
  );
}
