# Folder Structure

This document defines how the project is organized. A consistent structure makes the codebase easier to navigate, maintain, and extend.

The guiding principle is:

> **Separate code by architectural responsibility first, then by business resource.**

---

# Typical Project Layout

```text
project/
│
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   │
│   ├── models/
│   ├── schemas/
│   ├── repositories/      # Optional
│   ├── services/
│   ├── routes/
│   │
│   ├── dependencies/
│   ├── middleware/
│   ├── core/
│   └── utils/
│
├── docs/
├── tests/
├── .env
├── .gitignore
└── README.md
```

Not every project requires every directory. Only include layers that provide value.

---

# Layer Responsibilities

Each directory has a single responsibility.

| Directory       | Responsibility                                 |
| --------------- | ---------------------------------------------- |
| `models/`       | SQLAlchemy models                              |
| `schemas/`      | Pydantic request and response models           |
| `repositories/` | Database access (optional)                     |
| `services/`     | Business logic                                 |
| `routes/`       | FastAPI routers and endpoints                  |
| `dependencies/` | Dependency injection helpers                   |
| `middleware/`   | HTTP middleware                                |
| `core/`         | Configuration, security, shared infrastructure |
| `utils/`        | Reusable helper functions                      |

Business logic should never leak across these boundaries.

---

# Resource Organization

Each business resource should own its implementation across the relevant layers.

Example:

```text
models/
    user_model.py

schemas/
    user_schema.py

repositories/
    user_repository.py

services/
    user_service.py

routes/
    user_route.py
```

A resource should have files only in the layers it actually requires.

---

# File Naming

Layer files follow the pattern:

```text
<resource>_<layer>.py
```

Examples:

```text
user_model.py
user_schema.py
user_repository.py
user_service.py
user_route.py
```

Infrastructure files use descriptive names.

Examples:

```text
main.py
database.py
config.py
security.py
```

---

# Infrastructure Modules

Infrastructure code should remain centralized.

Typical responsibilities include:

* Application startup
* Configuration
* Database setup
* Dependency injection
* Authentication
* Middleware registration

Avoid duplicating infrastructure code across multiple modules.

---

# Imports

Prefer absolute imports throughout the project.

Example:

```python
from app.models.user_model import User
from app.services.user_service import UserService
```

Relative imports should only be used when they improve clarity within closely related modules.

The project should consistently use one import style.

---

# Package Organization

Each directory should contain closely related code.

Avoid creating directories that contain only one file unless they are expected to grow.

Likewise, avoid extremely large modules that should be split into smaller units.

---

# Adding a New Resource

When introducing a new business resource, create the corresponding files in each required layer.

Typical workflow:

1. Create the database model (if needed).
2. Create request and response schemas.
3. Create the repository (if the project uses repositories).
4. Create the service.
5. Create the router.
6. Register the router with the application.
7. Add tests.
8. Add documentation if necessary.

Not every resource requires every layer.

---

# Adding New Layers

New architectural layers should only be introduced when they solve a recurring problem.

Before creating a new top-level directory, ask:

* Does this represent a distinct responsibility?
* Will multiple modules use it?
* Is it likely to grow?

Avoid creating layers for a single feature or file.

---

# Growth Strategy

As the application grows:

* Keep resources cohesive.
* Keep responsibilities separated.
* Split large modules before they become difficult to maintain.
* Prefer extending existing architecture over introducing parallel structures.

Consistency is more valuable than novelty.

---

# Organizational Principles

The folder structure should always reflect the architecture.

Follow these principles:

* Organize by responsibility first.
* Keep related code together.
* Minimize cross-layer coupling.
* Avoid duplicate implementations.
* Keep infrastructure centralized.
* Keep business logic in the service layer.
* Make new features easy to locate.

A developer unfamiliar with the project should be able to predict where any piece of code belongs based solely on its responsibility.
