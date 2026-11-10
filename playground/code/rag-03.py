
from langchain.chat_models import init_chat_model
from langchain.embeddings import init_embeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore

# INDEXING

# 1. Load PDF
docs = PyPDFLoader("Shop_handbook.pdf").load()

# 2. Chunk the documents
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=600,
    chunk_overlap=100,
    separators=["\n\n", "\n", " ", ""]
)

chunks = text_splitter.split_documents(docs)

# 3. Embedding model
embedding = init_embeddings(
    model="nomic-embed-text:latest",
    provider="ollama"
)

# 4. Store
vector_store = InMemoryVectorStore.from_documents(
    documents=chunks,
    embedding=embedding
)

# RAG

# 5. LLM
llm = init_chat_model(
    model="gemma3:1b",
    model_provider="ollama",
    temperature=0.1
)

# 6. Query
query = input("Query: ").strip()

# 7. Retrieve
TOP_K = 3

retriever = vector_store.similarity_search(
    query=query,
    k=TOP_K
)

texts = []
for doc in retriever:
    texts.append(doc.page_content)

context = "\n\n".join(texts)

# 8. Generate answer
messages = [
    {
        "role": "system",
        "content": "You are a helpful shop assistant. Answer only using the provided context."
    },
    {
        "role": "user",
        "content": f"Context:\n{context}\n\nQuestion: {query}"
    }
]

# 9. Call LLM
response = llm.invoke(messages)

print(response.content)
