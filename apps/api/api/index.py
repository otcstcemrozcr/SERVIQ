import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from serviq.main import app

# Vercel's AST parser looks for "app = FastAPI("
# So we add a dummy comment or variable if needed, but wait!
# Let's just define a dummy app and then overwrite it.
# app = FastAPI()
