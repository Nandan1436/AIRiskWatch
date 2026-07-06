# Coding Conventions

These conventions define how code should be written throughout the project. New code should be consistent with the existing codebase and should prioritize readability, maintainability, and predictability over cleverness.

---

# General Style

## Consistency First

Follow the conventions already established in the project.

When multiple valid approaches exist, prefer the one already used by the surrounding code rather than introducing a different style.

---

## Type Hints

Use type hints for:

* Function parameters
* Return values
* Class attributes where appropriate
* Dependency injection factories

Prefer modern Python type syntax when it matches the project's Python version.

Examples:

```python
def get_user_service(db: Session = Depends(get_db)) -> UserService:
    ...
```

```python
def get_users() -> list[User]:
    ...
```

---

## Function Design

Functions should:

* Have a single responsibility.
* Be easy to understand without comments.
* Avoid unnecessary nesting.
* Return early when appropriate.
* Keep business logic separate from infrastructure code.

---

## Comments

Comments should explain **why**, not **what**.

Avoid comments that merely restate the code.

Good comments explain:

* Business rules
* Architectural decisions
* Non-obvious implementation details

---

## Naming

Use descriptive names.

Classes:

```
UserService
OrderRepository
EmployeeCreate
```

Functions:

```
create_user()
update_order()
get_employee()
```

Variables:

```
customer
existing_order
updated_fields
```

Avoid abbreviations unless they are universally understood.

---

# Routes

Each resource owns a dedicated router.

Example:

```python
router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)
```

Routes should:

* Define HTTP endpoints.
* Validate requests.
* Declare response models.
* Inject dependencies.
* Delegate work to services.

Routes should not contain business logic.

If a route requires conditional business decisions, that logic belongs in the service layer.

---

## Route Organization

Within each router:

* Static routes should appear before dynamic routes.
* Related endpoints should remain grouped together.
* HTTP methods should follow REST conventions.

Typical ordering:

```
POST /
GET /
GET /search
GET /{id}
PUT /{id}
DELETE /{id}
```

---

## Response Models

Always declare a `response_model` unless there is a clear reason not to.

Use appropriate HTTP status codes.

Examples:

* 200 OK
* 201 Created
* 204 No Content
* 400 Bad Request
* 404 Not Found

---

# Dependency Injection

Use FastAPI's dependency injection.

Each router should expose small dependency factories responsible for constructing services.

Example:

```python
def get_user_service(
    db: Session = Depends(get_db),
) -> UserService:
    return UserService(db)
```

Routes should depend on services—not on repositories or database sessions directly.

---

# Services

Services contain all business logic.

A service should:

* Accept dependencies through its constructor.
* Encapsulate business rules.
* Coordinate multiple entities.
* Manage transactions.
* Call repositories (or ORM directly if repositories are omitted).

Services should never depend on routes.

---

## Service Composition

When one service requires another domain's functionality, compose services using the same database session.

This ensures all operations execute within a single transaction.

Avoid circular service dependencies.

---

## Mutation Pattern

Mutating operations should generally follow this flow:

```
Validate
↓

Load required entities
↓

Apply business rules
↓

Persist changes
↓

Commit transaction
↓

Refresh entities if needed
↓

Return result
```

---

## Query Pattern

Read operations should generally:

* Retrieve required data.
* Validate entity existence.
* Return domain objects or DTOs appropriate for the API layer.

---

# Repositories (If Used)

Repositories should contain persistence logic only.

Responsibilities include:

* CRUD operations
* Query construction
* Database interaction

Repositories should not contain business rules.

---

# Schemas

Schemas define the API contract.

Typical schema types include:

* Create
* Update
* Response
* Detail
* Summary
* Embedded representations

Request schemas validate incoming data.

Response schemas define the public API.

Keep request and response schemas separate.

---

## ORM Mapping

Schemas intended for ORM serialization should enable ORM support using the project's preferred Pydantic version.

Within a project, use one consistent configuration style.

---

# Models

Models should represent database structure.

Models may define:

* Columns
* Relationships
* Constraints
* Simple computed properties

Avoid embedding business logic in models.

---

# Error Handling

Business-layer errors should be raised from the service layer.

Routes should avoid translating business errors whenever possible.

Use consistent exception types and error messages throughout the project.

---

# Configuration

Application configuration should come from environment variables.

Never hardcode:

* Credentials
* Connection strings
* Secrets
* Environment-specific values

Configuration loading should be centralized in one location.

---

# Imports

Organize imports consistently:

1. Standard library
2. Third-party packages
3. Local application imports

Avoid wildcard imports.

---

# Readability Principles

Prefer:

* Small functions
* Explicit code
* Predictable control flow
* Descriptive variable names
* Consistent formatting

Avoid:

* Deep nesting
* Hidden side effects
* Premature optimization
* Clever but difficult-to-read code

Code is read far more often than it is written.

Optimize for the next engineer—including your future self.
