# Architecture

## Overview

This project is a **monolithic REST API** built with **FastAPI**, **SQLAlchemy ORM**, and **Pydantic**.

The application follows a layered architecture where each layer has a single responsibility. Business logic, HTTP handling, validation, and database access are intentionally separated to keep the codebase maintainable and scalable.

The concrete database engine is an implementation detail determined solely by the `DATABASE_URL` environment variable. Application code must remain database-agnostic and rely only on SQLAlchemy abstractions.

The application is deployed as a single FastAPI service with no assumptions about background workers, caches, message brokers, or external integrations. Such components may be introduced in the future if required, but should remain separate from the core application architecture.

---

# Tech Stack

| Concern | Rule |
|---------|------|
| Web Framework | FastAPI |
| Routing | One APIRouter per resource/domain |
| ORM | SQLAlchemy |
| Validation | Pydantic |
| Configuration | Environment variables (`.env`) |
| Dependency Injection | FastAPI Depends |
| Database | SQL database selected via `DATABASE_URL` |
| API Style | REST |

Technology choices may evolve over time, but the architectural principles should remain consistent.

---

# Layered Architecture

Every feature must follow the same request flow.

```
HTTP Request
      │
      ▼
Route Layer
      │
      ▼
Service Layer
      │
      ▼
Repository Layer (optional)
      │
      ▼
ORM Models
      │
      ▼
Database
```

---

## Route Layer

Responsibilities:

- Define HTTP endpoints
- Parse path/query/body parameters
- Perform request validation through Pydantic
- Declare response models
- Inject dependencies
- Delegate work to services

Routes should **not** contain business logic.

Routes should remain thin and primarily orchestrate request → service → response.

---

## Service Layer

The service layer contains the application's business logic.

Responsibilities include:

- Business rules
- Validation beyond request validation
- Coordination between multiple entities
- Transaction management
- Calling repositories
- Composing multiple services when necessary

Services should not depend on routes.

Business rules belong here—not in routes, schemas, or models.

---

## Repository Layer (Optional)

Projects may use a repository layer depending on complexity.

Responsibilities include:

- Database queries
- CRUD operations
- Persistence logic

Repositories should not contain business rules.

If a repository layer is omitted, services interact directly with SQLAlchemy models.

Whichever approach is chosen should remain consistent throughout the project.

---

## Model Layer

Models define the database structure.

Responsibilities:

- SQLAlchemy model definitions
- Relationships
- Database constraints
- Persistence mapping

Models should avoid business logic beyond simple computed properties.

---

## Schema Layer

Schemas define the API contract.

Responsibilities:

- Request validation
- Response serialization
- Data transfer between HTTP and application layers

Schemas should never contain business logic.

Typical schema types include:

- Create
- Update
- Response
- Detail
- List

---

# Dependency Direction

Dependencies always flow downward.

```
Routes
    ↓
Services
    ↓
Repositories (optional)
    ↓
Models
```

Lower layers must never depend on higher layers.

Examples:

- Services never import routes.
- Models never import services.
- Repositories never import routes.

---

# Dependency Injection

Dependency injection is handled using FastAPI's `Depends`.

Each route module should expose small dependency factories for constructing services.

Example:

```python
def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)
```

Endpoints should receive services through dependency injection rather than constructing them directly.

There is no global dependency injection container.

---

# Database

Database access should remain portable across SQLAlchemy-supported SQL databases.

Guidelines:

- Avoid engine-specific SQL.
- Prefer ORM operations.
- Use SQLAlchemy functions where appropriate.
- Keep application code independent of the database vendor.

The database connection, engine, session factory, and declarative base should be centralized in a single module.

---

# Transactions

Business operations that modify multiple entities should execute within the same database transaction.

Services collaborating on the same operation should share the same SQLAlchemy session.

This ensures:

- Atomicity
- Consistency
- Predictable rollback behavior

---

# Service Composition

A service may compose other services when implementing business workflows.

Composed services should receive the same database session to ensure all operations participate in a single transaction.

Example:

```python
class OrderService:

    def __init__(self, db: Session):

        self.db = db
        self.customer_service = CustomerService(db)
        self.inventory_service = InventoryService(db)
```

Avoid circular dependencies between services.

---

# Routing

Each resource should own a dedicated router.

Example:

```
app/routes/

employee_route.py
department_route.py
project_route.py
```

Routes should be registered centrally by the application entry point.

When defining routes:

- Static routes should be declared before dynamic routes.
- Use RESTful naming conventions.
- Keep endpoint responsibilities focused.

---

# Application Wiring

The application entry point should:

- Create the FastAPI application
- Register routers
- Configure middleware
- Configure exception handlers
- Configure startup/shutdown events if needed

Database initialization and dependency setup should remain separate from business logic.

---

# Domain Design

Each business resource should generally contain:

```
<Resource>

├── route
├── service
├── repository (optional)
├── model
└── schemas
```

Resources should be cohesive and own their business logic.

Relationships between resources should be implemented using SQLAlchemy relationships and coordinated through the service layer.

---

# Business Invariants

Business rules that span multiple entities belong in the service layer.

Whenever multiple records must remain synchronized, they should be updated within the same transaction.

Business invariants should never rely on the route layer for correctness.

---

# Running the Application

Typical startup flow:

1. Configure environment variables.
2. Initialize the database if necessary.
3. Start the FastAPI application.
4. Register all routers.
5. Begin serving HTTP requests.

The exact startup commands and deployment process may vary between projects without affecting the architecture.

---

# Architectural Principles

The following principles take precedence over convenience:

- Separation of concerns
- Single responsibility
- Explicit dependencies
- Thin routes
- Business logic in services
- Consistent project structure
- Database portability
- Strong typing
- Predictable request flow
- Readability over cleverness
- Consistency over premature optimization

Any new feature should integrate into the existing architecture rather than introducing a new architectural pattern unless there is a compelling reason to do so.