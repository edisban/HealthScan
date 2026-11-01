FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# The slim image has no GUI libs (libGL/libxcb), so swap in headless OpenCV or ultralytics fails to import
RUN pip uninstall -y opencv-python && pip install --no-cache-dir opencv-python-headless
# Bake the YOLO weights into the image instead of downloading on first request
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

