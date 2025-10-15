# Lightweight Python image
FROM python:3.11-slim

WORKDIR /app
COPY orgchart_app /app

RUN pip install --no-cache-dir -r requirements.txt

# Seed optional data at build-time (ignored if file missing)
RUN python -c "import os,sys;import seed as s; print('Skipping seed at build-time')"

ENV PORT=7860
EXPOSE 7860

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:7860", "wsgi:app"]
