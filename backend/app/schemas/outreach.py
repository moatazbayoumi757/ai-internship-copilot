from typing import Literal

from pydantic import BaseModel, Field


class OutreachGenerateRequest(BaseModel):
    recruiter_name: str = Field(min_length=1, max_length=120)
    company: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=160)
    how_i_found_them: str = Field(min_length=1, max_length=300)
    background_summary: str = Field(min_length=1, max_length=600)
    reason_for_reaching_out: str = Field(min_length=1, max_length=400)
    message_type: Literal["LinkedIn", "Email", "Follow-up"]
    tone: Literal["Warm", "Concise", "Confident"]


class OutreachGenerateResponse(BaseModel):
    message: str
