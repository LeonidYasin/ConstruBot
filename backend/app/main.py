from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MATERIALS = {
    "board": {"length": 6, "price": 450},
    "screw": {"price": 0.5}
}

app = FastAPI()

# Разрешаем CORS для локальной разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CalculateResponse(BaseModel):
    boards_count: int
    screws_count: int
    roof_area: float

@app.get("/calculate", response_model=CalculateResponse)
def calculate(
    width: float = Query(..., gt=0),
    height: float = Query(..., gt=0)
):
    # Формулы расчёта
    base_perimeter = width * 2 + height * 2
    boards = int((base_perimeter / 0.6) + (width / 0.5 * 2))
    screws = int(boards * 8)
    roof_area = round(width * height * 1.2, 2)
    return {
        "boards_count": boards,
        "screws_count": screws,
        "roof_area": roof_area
    } 