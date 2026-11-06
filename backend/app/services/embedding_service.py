
from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Load the embedding model once per Python process.
    The first run may download the model.
    """
    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Convert a list of text chunks into 384-dimensional
    embedding vectors.
    """
    if not texts:
        return []

    model = get_embedding_model()

    embeddings = model.encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Convert a search query into a 384-dimensional vector.
    """
    if not query.strip():
        raise ValueError("Search query cannot be empty")

    return embed_texts([query])[0]
