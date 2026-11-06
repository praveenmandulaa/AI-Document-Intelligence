
import re

CHUNK_SIZE = 900
CHUNK_OVERLAP = 150


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    if chunk_size <= 0 or not 0 <= overlap < chunk_size:
        raise ValueError("Invalid chunk size or overlap")

    cleaned = re.sub(r"\s+", " ", text).strip()

    if not cleaned:
        return []

    chunks = []
    start = 0

    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))

        if end < len(cleaned):
            last_space = cleaned.rfind(" ", start + 1, end)
            if last_space > start + chunk_size // 2:
                end = last_space

        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(cleaned):
            break

        next_start = max(start + 1, end - overlap)

        if cleaned[next_start - 1] != " ":
            next_space = cleaned.find(" ", next_start, end)
            if next_space != -1:
                next_start = next_space + 1

        start = next_start

    return chunks


def chunk_document_pages(pages: list) -> list[dict]:
    result = []
    chunk_index = 0

    for page in pages:
        for content in chunk_text(page.text_content):
            result.append({
                "chunk_index": chunk_index,
                "page_number": page.page_number,
                "content": content,
            })
            chunk_index += 1

    return result
