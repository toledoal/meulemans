"""Meulemans — API (FastAPI, solo lectura) + SPA estática. Capa de consulta sobre el Corpus Integrativo."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db, queries as Q

WEB = os.path.join(os.path.dirname(__file__), "..", "web")


@asynccontextmanager
async def lifespan(app):
    db.pool.open()
    yield
    db.pool.close()


app = FastAPI(title="Meulemans", version="0.1", lifespan=lifespan)


@app.get("/api/stats")
def stats():
    return Q.stats()


@app.get("/api/sources")
def sources():
    return Q.sources()


@app.get("/api/families")
def families():
    return Q.families()


@app.get("/api/lects")
def lects(family: str = "", q: str = ""):
    return Q.lects(family or None, q or None)


@app.get("/api/search")
def search(q: str, lect: str = "", family: str = ""):
    return Q.search_word(q, lect or None, family or None)


@app.get("/api/concepts")
def concepts(q: str):
    return Q.search_concept(q)


@app.get("/api/concept/{cid}")
def concept(cid: int, family: str = "", branch: str = ""):
    return Q.concept_forms(cid, family or None, branch or None)


@app.get("/api/form")
def form(id: str):
    return Q.form_detail(id)


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB, "index.html"))


app.mount("/", StaticFiles(directory=WEB), name="web")
