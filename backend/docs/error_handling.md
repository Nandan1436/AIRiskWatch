# Error Handling

This document defines how errors are handled throughout the application.

The goals are:

* Predictable behavior
* Consistent API responses
* Clear separation of concerns
* Meaningful error messages

---

# Responsibility

Business-layer errors originate in the service layer.

Routes should not contain business validation or decision-making.

Responsibilities:

| Layer    | Responsibility                          |
| -------- | --------------------------------------- |
| Routes   | HTTP request handling                   |
| Services | Business validation and business errors |
| Database | Persistence only                        |

Request validation (types, required fields, schema validation) should be handled by Pydantic whenever possible.

Avoid manually re-validating what the schema already guarantees.

---

# Error Strategy

The project should use **one consistent error-handling strategy**.

Examples include:

* Raising `HTTPException`
* Raising custom domain exceptions handled globally
* A centralized exception middleware

Do not mix multiple approaches within the same project.

---

# Error Categories

Different failures should communicate different problems.

Typical categories include:

| Situation                  | Typical HTTP Status |
| -------------------------- | ------------------- |
| Resource not found         | 404                 |
| Invalid business operation | 400 or 409          |
| Invalid request data       | 422                 |
| Authentication required    | 401                 |
| Permission denied          | 403                 |
| Unexpected server error    | 500                 |

Use status codes consistently throughout the application.

---

# Error Messages

Error messages should be:

* Short
* Clear
* Human-readable
* Consistent

Good examples:

```text
User not found
Email already exists
Insufficient permissions
Order has already been completed
```

Avoid:

* Stack traces
* SQL errors
* Internal implementation details
* Sensitive information

Error messages should explain the problem, not the implementation.

---

# Validation Order

Validate requests in a predictable order.

Typical sequence:

1. Resource existence
2. Authorization
3. Business rules
4. State validation
5. Persistence

Fail fast when a validation step cannot succeed.

Avoid executing unnecessary work after an error has already been detected.

---

# Transactions

Whenever an operation modifies data:

* Perform validation before persistence whenever possible.
* Complete the entire business operation within one transaction.
* Roll back changes if the operation fails.

The database should never be left in a partially updated state.

---

# Reuse Existing Validation

Avoid duplicating validation logic.

If one service already provides a method that validates a business rule or resource existence, reuse that method instead of implementing the same logic again.

This keeps behavior and error messages consistent throughout the application.

---

# Collection Endpoints

Empty collections are not errors.

Examples:

```text
[]
```

is preferable to

```text
404 Not Found
```

Reserve "not found" responses for requests targeting a specific resource.

---

# Unexpected Errors

Unexpected exceptions should propagate through the project's chosen error-handling mechanism.

Avoid swallowing exceptions unless they can be meaningfully handled.

If an exception cannot be recovered from, allow it to propagate so the application's global error-handling strategy can produce an appropriate response.

---

# Principles

Follow these principles consistently:

* Validate early.
* Fail fast.
* Keep business validation in the service layer.
* Return consistent error responses.
* Never expose internal implementation details.
* Use meaningful status codes.
* Keep error messages concise and user-focused.
