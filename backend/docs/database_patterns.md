# Database Patterns

This document defines how the application interacts with the database. The goal is to keep persistence predictable, maintainable, and independent of any specific database vendor.

---

# Database Independence

The application should remain database-agnostic.

Database-specific behavior should never leak into business logic.

Prefer SQLAlchemy abstractions over vendor-specific SQL whenever possible.

Examples include:

* ORM models
* SQLAlchemy query APIs
* Generic column types
* SQLAlchemy SQL functions

Avoid:

* Raw SQL unless absolutely necessary
* Vendor-specific SQL features
* Database-specific data types when portable alternatives exist

---

# Database Configuration

Database configuration should be centralized in a single module.

That module should own:

* Engine creation
* Session factory
* Declarative base
* Dependency for obtaining database sessions

No other module should create engines or sessions.

Application code should receive database sessions through dependency injection.

---

# Session Lifecycle

Each request should operate within a single database session.

Sessions should:

* Be created by the application's dependency layer
* Be injected into services
* Be closed automatically after the request

Business logic should never manually create additional sessions.

---

# Models

Each database table should be represented by one SQLAlchemy model.

Models are responsible for:

* Table definitions
* Columns
* Relationships
* Database constraints

Models should not contain business logic.

Business rules belong in the service layer.

---

## Model Design

Models should use:

* Explicit primary keys
* Explicit foreign keys
* Appropriate indexes
* Explicit nullability
* Appropriate constraints

Avoid implicit behavior whenever possible.

Relationships should be defined using SQLAlchemy relationships.

Bidirectional relationships should use `back_populates` when appropriate.

---

# Schema Evolution

The project should use a single, consistent strategy for schema management.

Examples include:

* Alembic migrations
* SQLAlchemy metadata creation
* Manual migration scripts

Do not mix multiple migration strategies within the same project.

---

# Query Patterns

Database queries belong in:

* Repositories, if the project uses repositories
* Services, if repositories are intentionally omitted

Routes should never execute database queries directly.

---

## Read Operations

Read operations should generally:

1. Build the query.
2. Apply filters.
3. Load related entities when appropriate.
4. Return ORM objects or DTOs.

Missing required entities should be handled consistently across the project.

---

## Filtering

Filtering should remain readable and composable.

Complex query construction should be broken into multiple steps rather than deeply nested expressions.

Optional filters should only be applied when corresponding parameters are provided.

---

## Relationships

When related data is required by the API response, load it efficiently.

Choose appropriate loading strategies (such as eager loading) to avoid unnecessary database queries.

Avoid N+1 query patterns.

---

## Aggregation

Aggregate queries should:

* Clearly name computed values
* Match the API response structure
* Remain readable
* Keep business calculations in the service layer

---

# Write Operations

Mutating operations should generally follow this lifecycle:

1. Validate input.
2. Load required entities.
3. Apply business rules.
4. Persist changes.
5. Commit the transaction.
6. Refresh entities if necessary.
7. Return the result.

Validation should occur before persistence whenever possible.

---

# Transactions

A single business operation should complete within a single transaction.

When multiple entities are modified together, commit only after every change has been applied successfully.

Avoid partial commits during a business workflow.

If an operation fails, the transaction should be rolled back.

---

# Entity State

Business invariants spanning multiple entities should be maintained within the same transaction.

Examples include:

* Inventory updates
* Balance transfers
* Status transitions
* Relationship changes

The database should never be left in a partially updated state.

---

# Primary Keys

Use one consistent primary key strategy throughout the project.

Examples include:

* Auto-increment integers
* UUIDs
* ULIDs

Do not mix identifier strategies without a clear architectural reason.

---

# Timestamps

Use one consistent timestamp strategy throughout the project.

The project should define:

* Time zone handling
* Creation timestamps
* Update timestamps
* Audit fields

Prefer storing timestamps in UTC.

---

# Performance

Prioritize correctness and readability before optimization.

When optimization becomes necessary:

* Reduce unnecessary queries
* Use appropriate indexes
* Load related data efficiently
* Avoid duplicated database work

Measure performance before introducing complexity.

---

# Architectural Principles

Database code should follow these principles:

* One session per request
* One transaction per business operation
* Database independence
* Business logic outside models
* Explicit transactions
* Predictable query structure
* Consistent persistence patterns
* Readability over clever optimization
