# GridPulse - Production-Grade Architecture & System Design

This document details the production-ready system design and architecture of the **GridPulse Congestion Mitigator**. The design focuses on extreme scalability, low latency, and fault tolerance, built to handle real-time municipal transit feeds for major metropolitan areas.

---

## 1. High-Level Architecture

The GridPulse system is designed as a distributed event-driven microservices architecture. It divides concerns into distinct ingestion, streaming, storage, inference, and visualization layers.

```
                  ┌──────────────────────────────┐
                  │ Simulated Real-Time IoT Feeds│
                  └──────────────┬───────────────┘
                                 │ HTTP POST / gRPC
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER (API Gateway)               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                MESSAGE BUS (Apache Kafka Backplane)             │
│   Topics: astram.raw-events  |  astram.processed-events         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
┌──────────────────────────────┐                 ┌──────────────────────────────┐
│  STREAM PROCESSING ENGINE    │                 │    MODEL INFERENCE WORKER    │
│ (Apache Flink / Spark Temp)  │                 │   (Triton Inference Server)  │
│  - H3 Hex Grid Aggregations  │                 │   - Severity Forecast        │
│  - DBSCAN Sliding Clustering │                 │   - Clearance Duration Pred  │
└──────────────┬───────────────┘                 └──────────────┬───────────────┘
               │                                                │
               └────────────────────────┬───────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  KNOWLEDGE BASE & STORAGE LAYER                 │
│    - PostgreSQL + PostGIS (Persistent geo-events & hotspots)    │
│    - Redis Cache (Model outputs & active state query cache)     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API SERVICES (FastAPI Microservice)          │
│   Exposes gRPC/REST endpoints for commands, maps, and UI        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VISUALIZATION & WEB COMMAND                 │
│      Operational Leaflet/Mapbox Dashboard & Operator Console    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design & Scale

### A. Ingestion & Queuing Layer (Apache Kafka)
* **Design**: Standard HTTP/gRPC ingress gateways validate and normalize incident reports from transit partners and police feeds. Normalized events are published to a high-throughput **Apache Kafka** cluster.
* **Topics**:
  * `astram.raw-events`: Holds raw sensor and manual dispatcher reports.
  * `astram.processed-events`: Emits cleaned, geocoded, and timestamped incidents.
* **Scale**: Partitioned by the event's H3 Hex Index (Resolution 7) ensuring that events in the same geographical district route to the same Kafka partition. This allows distributed consumers to maintain spatial locality and guarantees in-order processing of regional updates.

### B. Stream Processing Engine (Apache Flink)
* **Design**: An **Apache Flink** streaming application consumes from `astram.processed-events`. Flink maintains two stateful sliding windows:
  * **Window A (Hotspots)**: A 5-minute sliding window that converts coordinates into H3 indices (Resolution 8), aggregates event densities, and computes average running severity.
  * **Window B (Clustering)**: A 10-minute sliding window that runs incremental **DBSCAN spatial clustering** across active coordinates. Flink streams the clustered event labels directly to Kafka.
* **Scale**: Stateful processing is checkpointed into distributed storage (MinIO/S3) to recover with zero data loss under cluster outages.

### C. Persistent Storage Layer (PostgreSQL & PostGIS)
* **Design**: The system uses **PostgreSQL** with the **PostGIS** spatial extension as the primary database.
* **Schemas & Partitioning**:
  * **`events` table**: Partitioned horizontally (range partitioning) by `start_datetime` month-by-month. High-use columns (`latitude`, `longitude`) are indexed using **GIST spatial indexes** to accelerate coordinate bounds queries.
  * **`hotspots` table**: Uses the H3 cell index (TEXT) as a hash primary key. Updates occur via atomic UPSERT statements written by Flink consumers.
* **Scale**: Read replicas handle REST API traffic, while the primary node handles streaming writes.

### D. Model Inference & Analytics Pipeline (Triton / Redis)
* **Design**: Standard ML pipelines (RandomForest or XGBoost models) are served inside **Triton Inference Server**.
* **Inference Flow**:
  1. FastAPI receives a new event or simulation request.
  2. The gateway hashes the event parameters (`h3_index` + `hour` + `day_of_week` + `cause` + `priority`).
  3. FastAPI queries **Redis** for the hash key.
     * **Cache Hit**: Returns the severity score and duration immediately, bypassing inference (under 1ms latency).
     * **Cache Miss**: Triton executes model inference, writes the output to Redis (with a 10-minute Time-To-Live for active events), and returns the results to the API layer (under 10ms latency).
* **Optimization Engine**: Recommends resource guidelines (officers, barricades) based on severity, road closure requirements, and incident templates.

### E. API Services (FastAPI Microservice)
* **Design**: Lightweight, stateless **FastAPI** worker pods deploy inside a Kubernetes cluster, managed by an Alb Ingress Controller. 
* **Endpoints**: Query PostgreSQL replicas to fetch current events and active hotspots. Simulating custom scenarios occurs completely in memory by evaluating Triton endpoints and returning a temporary payload without polluting the database unless committed by the user.

---

## 3. High Availability, Security, & DR

* **Kubernetes Orchestration**: The entire backend is containerized (Docker) and deployed via **Kubernetes (K8s)** across multiple availability zones. Pod autoscalers scale FastAPI nodes based on CPU usage and Kafka consumer lag.
* **Security & Auth**: API gateways enforce JWT-based authorization for operator logins. Transit APIs use secure OAuth2 token exchanges. SSL/TLS encrypts all database transfers.
* **Disaster Recovery (DR)**: Periodic database snapshots are stored in geo-redundant bucket storage. In the event of a region-wide database failure, traffic shifts to a passive hot-standby region.
