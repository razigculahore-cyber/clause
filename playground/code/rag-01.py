from langchain.chat_models import init_chat_model
from langchain.embeddings import init_embedding_model

from langchain_core.documents import Document
from langchain_text_splitter import RecursiveTextSplitter
from langchain_core.vectorstores import     InMemoryVectorStorenmemory

#INDEXING
#1. Load the documents
text = Path("Shop_handbook.md").read_text(encoding="utf-8")
doc = Document(
page_content=text
metadata={"source": "Shop_handbook.md"}
)

#2. Chunk the documents
text_splitter = RecursiveTextSplitter(
    chunk_size=600, 
    chunk_overlap=100,
    separators = ["\n\n", "\n", " ", ""]
    )
chunks = text_splitter.split_documents(documents=[doc])

# embedding model
embedding = init_embedding(
    model = "nomic-embed-text:latest",
    provider = "ollama")

#4. Store
vector_store =  InMemoryVectorStore.from_documents(
    documents=chunks,
    embedding=embedding
)

# Rag
# LLM
llm = init_chat_model(
    model = "gemma3:1b",
    provider = "ollama",
    temperature=0.1
)
#Query
query = input("Query: ").strip()

# Retreive 
retriever = vector_store.similarity_search(query=query, k=3)
texts = []
for doc in retriever:
    texts.append(doc.page_content)
context = "\n\n".join(texts)    
# Generate answer
message = [
    {"role": "system", "content": "You are a helpful clause shop assistant."},
    {"role": "user", "content": f"\n\nQuestion: {query}"}
]

# call the LLM
print(llm.invoke(messages=message, context=context))