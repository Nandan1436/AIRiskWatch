# Naming Conventions

Consistent naming improves readability, discoverability, and maintainability. Follow the conventions below unless there is a compelling reason to do otherwise.

---

# Files and Directories

## Layer Directories

Use lowercase plural names.

Examples:

```text
models/
schemas/
services/
repositories/
routes/
dependencies/
utils/
```

---

## Layer Files

Use the pattern:

```text
<resource>_<layer>.py
```

Examples:

```text
user_model.py
user_schema.py
user_service.py
user_repository.py
user_route.py
```

Infrastructure modules should use descriptive snake_case names.

Examples:

```text
main.py
database.py
config.py
dependencies.py
```

---

# Database

## Tables

Use plural snake_case names.

Examples:

```text
users
employees
departments
audit_logs
```

---

## Columns

Use snake_case.

Examples:

```text
first_name
created_at
updated_at
employee_id
```

---

## Primary Keys

Use a consistent primary key strategy throughout the project.

Typical examples:

```text
id
```

or

```text
user_id
```

depending on the project's conventions.

---

## Foreign Keys

Use:

```text
<referenced_resource>_id
```

Examples:

```text
user_id
department_id
manager_id
```

---

## Timestamp Fields

Use descriptive names.

Common examples:

```text
created_at
updated_at
deleted_at
approved_at
```

Event timestamps should describe the event.

Examples:

```text
submitted_at
completed_at
published_at
```

---

## Status Fields

When storing textual state values, use one consistent convention across the project.

Examples:

```text
ACTIVE
INACTIVE
PENDING
COMPLETED
CANCELLED
```

---

# Classes

Use PascalCase.

---

## ORM Models

Use singular nouns.

Examples:

```text
User
Employee
Department
Invoice
```

---

## Services

Use:

```text
<Resource>Service
```

Examples:

```text
UserService
OrderService
InvoiceService
```

---

## Repositories

Use:

```text
<Resource>Repository
```

Examples:

```text
UserRepository
ProductRepository
```

---

## Schemas

Request schemas:

```text
<Resource>Create
<Resource>Update
<Resource>Patch
```

Response schemas:

```text
<Resource>Response
<Resource>DetailResponse
```

Operation-specific responses:

```text
LoginResponse
ExportResponse
StatisticsResponse
```

Embedded schemas:

```text
<Resource>Summary
<Resource>Reference
<Resource>In<Context>
```

Choose one embedded naming style and use it consistently.

---

# Functions

Use snake_case.

Function names should describe what they do.

Examples:

```text
create_user
update_employee
delete_department
```

---

## Service Factories

Use:

```text
get_<resource>_service
```

Examples:

```text
get_user_service
get_employee_service
```

---

## CRUD Methods

Prefer explicit names.

Examples:

```text
create_user
get_user
update_user
delete_user
```

Collection operations:

```text
list_users
search_users
get_active_users
```

---

## Domain Operations

Prefer business terminology over generic CRUD verbs.

Examples:

```text
approve_invoice
assign_role
publish_article
archive_document
activate_account
```

These names should reflect the business language of the application.

---

# Variables

Use descriptive names.

Avoid unnecessary abbreviations.

---

## ORM Objects

When working with ORM entities inside services, use descriptive names.

Examples:

```text
user
employee
existing_order
updated_invoice
```

If the project distinguishes ORM instances from request schemas, use a consistent convention such as:

```text
db_user
db_order
```

---

## Request Schemas

Name request objects after the resource.

Examples:

```text
user
employee
order
```

---

## Services

Injected services should follow:

```text
<resource>_service
```

Examples:

```text
user_service
invoice_service
```

---

## Database Session

Use one consistent name throughout the project.

Common example:

```text
db
```

---

# API

## Router Prefixes

Use plural resource names.

Examples:

```text
/api/users
/api/orders
/api/employees
```

---

## Router Tags

Use human-readable plural names.

Examples:

```text
Users
Orders
Employees
```

---

## REST Endpoints

Collections:

```text
POST /
GET /
```

Single resources:

```text
GET /{id}
PUT /{id}
DELETE /{id}
```

Nested actions:

```text
POST /{id}/approve
POST /{id}/archive
```

Collection-level operations:

```text
GET /search
GET /statistics
POST /import
```

Choose endpoint names that reflect the domain language.

---

## Query Parameters

Use snake_case.

Examples:

```text
page_size
sort_by
created_after
search
```

---

## JSON Fields

Use snake_case.

JSON field names should remain consistent with schema definitions.

Avoid unnecessary abbreviations.

---

# General Principles

Prefer:

* Descriptive names
* Business terminology
* Consistency
* Singular names for individual entities
* Plural names for collections

Avoid:

* Abbreviations
* Inconsistent terminology
* Generic names like `data`, `temp`, or `obj`
* Multiple names for the same concept

A concept should have one name throughout the codebase.
