from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import FastAPI, Request
from pydantic import BaseModel, StringConstraints

from app.services.chat import RAGService, Answer


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.rag = RAGService()
    yield
    app.state.rag.close()


app = FastAPI(title="Clause AI APIs", lifespan=lifespan)


class AskQuestion(BaseModel):
    question: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
    ]


@app.get(path="/")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(path="/ask", response_model=Answer)
def ask_query(body: AskQuestion, req: Request) -> Any:
    return req.app.state.rag.ask(body.question)
